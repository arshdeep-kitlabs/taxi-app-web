/**
 * Composition root.
 *
 * The only file that names both an interface and a concrete class. Moving from
 * MySQL to anything else, or from a configuration file to a table, is a change
 * here and nowhere else.
 */
import { ConfigController } from './api/driver/01-config/config.controller.js';
import { AdminConfigController } from './api/admin/config/admin-config.controller.js';
import { RequestOtpController } from './api/driver/02-request-otp/request-otp.controller.js';
import { SignUpController } from './api/driver/03-signup/signup.controller.js';
import { VerifyOtpController } from './api/driver/04-verify-otp/verify-otp.controller.js';
import { SessionController } from './api/driver/05-session/session.controller.js';
import { RefreshController } from './api/driver/06-refresh/refresh.controller.js';
import { DocumentsController } from './api/driver/07-documents/documents.controller.js';
import { ReviewController } from './api/driver/08-review/review.controller.js';
import { SubmitController } from './api/driver/09-submit/submit.controller.js';
import { TrackStatusController } from './api/driver/10-track-status/track-status.controller.js';
import { AdminDriversController } from './api/admin/drivers/admin-drivers.controller.js';
import { AdminApplicationsController } from './api/admin/applications/admin-applications.controller.js';
import { AdminAuthController } from './api/admin/auth/admin-auth.controller.js';
import { AdminUsersController } from './api/admin/users/admin-users.controller.js';
import { RidesController } from './api/driver/11-rides/rides.controller.js';
import { EarningsController } from './api/driver/12-earnings/earnings.controller.js';
import { ProfileController } from './api/driver/13-profile/profile.controller.js';
import { RidePreferencesController } from './api/driver/14-ride-preferences/ride-preferences.controller.js';

import { AdminAuthService } from './modules/admin-auth/admin-auth.service.js';
import { MysqlAdminUserRepository } from './modules/admin-auth/providers/mysql-admin-user.repository.js';
import { AdminService } from './modules/admin/admin.service.js';
import { AppConfigService } from './modules/app-config/app-config.service.js';
import { JsonFileConfigSource } from './modules/app-config/providers/json-file-config.source.js';
import { AuthService } from './modules/auth/auth.service.js';
import { ConsoleOtpSender } from './modules/auth/providers/console-otp.sender.js';
import { HmacTokenService } from './modules/auth/providers/hmac-token.service.js';
import { MysqlDriverRepository } from './modules/auth/providers/mysql-driver.repository.js';
import { MysqlOtpChallengeRepository } from './modules/auth/providers/mysql-otp-challenge.repository.js';
import { MysqlVerifiedSessionRepository } from './modules/session/providers/mysql-verified-session.repository.js';
import { DocumentsService } from './modules/documents/documents.service.js';
import { MysqlDocumentRepository } from './modules/documents/providers/mysql-document.repository.js';
import { ReviewService } from './modules/review/review.service.js';
import { RidesService } from './modules/rides/rides.service.js';
import { ProfileService } from './modules/profile/profile.service.js';
import { RealtimeService } from './modules/realtime/realtime.service.js';
import { InMemoryConnectionRegistry } from './modules/realtime/providers/in-memory-connection-registry.js';
import { GenderPreferenceService } from './modules/gender-preference/gender-preference.service.js';
import {
  MysqlRideRepository,
  MysqlShiftRepository,
  seedDemoRides,
} from './modules/rides/providers/mysql-ride.repository.js';
import { SessionService } from './modules/session/session.service.js';
import { VehicleDetailsService } from './modules/vehicle/vehicle-details.service.js';
import { MysqlVehicleRepository } from './modules/vehicle/providers/mysql-vehicle.repository.js';

import { openDatabase } from './infrastructure/mysql/database.js';
import { applySchema } from './infrastructure/mysql/schema.js';
import { env } from './config/env.js';

export async function buildContainer() {
  // --- infrastructure -------------------------------------------------------
  const configSource = new JsonFileConfigSource(env.CONFIG_FILE);

  const database = openDatabase({
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
    connectionLimit: env.MYSQL_POOL_SIZE,
  });
  // Every statement is safe to run twice, so starting the server is the whole
  // migration story until the schema needs real migrations behind it.
  await applySchema(database);

  const driverRepository = new MysqlDriverRepository(database);
  const otpChallengeRepository = new MysqlOtpChallengeRepository(database);
  const documentRepository = new MysqlDocumentRepository(database);
  const vehicleRepository = new MysqlVehicleRepository(database);
  const verifiedSessionRepository = new MysqlVerifiedSessionRepository(database);
  const adminUserRepository = new MysqlAdminUserRepository(database);
  const rideRepository = new MysqlRideRepository(database);
  const shiftRepository = new MysqlShiftRepository(database);

  const connectionRegistry = new InMemoryConnectionRegistry();
  const realtimeService = new RealtimeService(connectionRegistry);

  const otpSender = new ConsoleOtpSender();
  const tokenService = new HmacTokenService(env.AUTH_SECRET, env.AUTH_TOKEN_MINUTES);

  if (env.ALLOW_TEST_ACCOUNTS) {
    const defaultCountry = configSource.load().signIn.countries.find((c) => c.isDefault);
    await driverRepository.seedTestDrivers(defaultCountry?.dialCode ?? '+44');

    // The earnings and history screens are unreadable against an empty rides
    // table, and nothing books a ride yet. Every driver gets sample work, not
    // just the reserved numbers — the one the Postman collection signs up as
    // is created at runtime, and an empty history reads as a broken endpoint.
    // seedDemoRides leaves a driver who already has rides alone.
    for (const driver of await driverRepository.listAll()) {
      await seedDemoRides(database, driver.id);
    }
  }

  // --- services -------------------------------------------------------------
  // The same object is both halves: it reads the file and it writes it.
  const appConfigService = new AppConfigService(configSource, configSource);
  const authService = new AuthService(
    driverRepository,
    otpChallengeRepository,
    otpSender,
    configSource,
    tokenService,
    verifiedSessionRepository,
    { exposeCode: env.EXPOSE_OTP_CODE, allowTestAccounts: env.ALLOW_TEST_ACCOUNTS },
  );

  const documentsService = new DocumentsService(documentRepository, configSource, driverRepository);
  const vehicleDetailsService = new VehicleDetailsService(vehicleRepository, configSource);
  const reviewService = new ReviewService(
    driverRepository,
    documentRepository,
    documentsService,
    vehicleDetailsService,
    configSource,
  );
  const ridesService = new RidesService(rideRepository, shiftRepository, configSource);
  const profileService = new ProfileService(
    driverRepository,
    vehicleRepository,
    documentRepository,
    rideRepository,
    ridesService,
    configSource,
  );
  const genderPreferenceService = new GenderPreferenceService(driverRepository, configSource);
  const adminAuthService = new AdminAuthService(adminUserRepository, tokenService);

  if (env.ALLOW_TEST_ACCOUNTS) {
    // A reviewer who can sign in from the first boot. Recording the API needs
    // an admin, and without this the only one that works is the first account
    // on an empty table — which made every recording run clear the table, and
    // sign whoever was using the panel out of their own account.
    await adminAuthService.seedReviewer('reviewer@kit-taxi.co', 'a-long-enough-password');
  }
  const adminService = new AdminService(
    database,
    documentsService,
    configSource,
    driverRepository,
    vehicleRepository,
    adminUserRepository,
    documentRepository,
    realtimeService,
  );
  const sessionService = new SessionService(
    verifiedSessionRepository,
    driverRepository,
    documentsService,
    tokenService,
    configSource,
  );

  // --- one controller per endpoint, in the order a driver meets them --------
  return {
    database,
    tokenService,
    adminUserRepository,
    // The socket layer needs these; nothing else does.
    connectionRegistry,
    realtimeService,
    shiftRepository,

    config: new ConfigController(appConfigService),
    requestOtp: new RequestOtpController(authService),
    signUp: new SignUpController(authService),
    verifyOtp: new VerifyOtpController(authService),
    session: new SessionController(sessionService),
    refresh: new RefreshController(authService),
    // Every upload — identity, vehicle, and the car's typed details.
    documents: new DocumentsController(documentsService, vehicleDetailsService),
    review: new ReviewController(reviewService),
    submit: new SubmitController(reviewService),
    trackStatus: new TrackStatusController(reviewService),
    // Everything after the application is approved: the work itself.
    rides: new RidesController(ridesService),
    earnings: new EarningsController(ridesService),
    profile: new ProfileController(profileService),
    ridePreferences: new RidePreferencesController(genderPreferenceService),

    // Sign-in for the panel, and who else is allowed one.
    adminAuth: new AdminAuthController(adminAuthService),
    adminUsers: new AdminUsersController(adminAuthService),

    adminConfig: new AdminConfigController(appConfigService),
    adminDrivers: new AdminDriversController(adminService),
    adminApplications: new AdminApplicationsController(adminService),
  };
}
