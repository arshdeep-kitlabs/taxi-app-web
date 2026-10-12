import express, { type Express } from 'express';
import { errorHandler, notFoundHandler } from './common/http/error-handler.js';
import { buildContainer } from './container.js';
import { configRoutes } from './api/driver/01-config/config.routes.js';
import { requestOtpRoutes } from './api/driver/02-request-otp/request-otp.routes.js';
import { signUpRoutes } from './api/driver/03-signup/signup.routes.js';
import { verifyOtpRoutes } from './api/driver/04-verify-otp/verify-otp.routes.js';
import { sessionRoutes } from './api/driver/05-session/session.routes.js';
import { refreshRoutes } from './api/driver/06-refresh/refresh.routes.js';
import { documentsRoutes } from './api/driver/07-documents/documents.routes.js';
import { reviewRoutes } from './api/driver/08-review/review.routes.js';
import { submitRoutes } from './api/driver/09-submit/submit.routes.js';
import { trackStatusRoutes } from './api/driver/10-track-status/track-status.routes.js';
import { ridesRoutes } from './api/driver/11-rides/rides.routes.js';
import { earningsRoutes } from './api/driver/12-earnings/earnings.routes.js';
import { profileRoutes } from './api/driver/13-profile/profile.routes.js';
import { ridePreferencesRoutes } from './api/driver/14-ride-preferences/ride-preferences.routes.js';
import { adminDriversRoutes } from './api/admin/drivers/admin-drivers.routes.js';
import { adminApplicationsRoutes } from './api/admin/applications/admin-applications.routes.js';
import { adminAuthRoutes } from './api/admin/auth/admin-auth.routes.js';
import { adminConfigRoutes } from './api/admin/config/admin-config.routes.js';
import { adminUsersRoutes } from './api/admin/users/admin-users.routes.js';

const ALLOWED_ORIGINS = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$|^https:\/\/[\w-]+\.vercel\.app$/;

/**
 * Everything main.ts needs: the app to listen with, and the pieces the
 * WebSocket layer attaches to the same server.
 */
export type BuiltApp = {
  app: Express;
  realtime: RealtimeDeps;
};

/**
 * Assembles the app. Kept separate from main.ts so a test can build it without
 * binding a port.
 */
export async function createApp(): Promise<BuiltApp> {
  const app = express();
  const container = await buildContainer();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  // The admin panel runs on its own address, so the browser needs telling that
  // this server will answer it. Only the headers the panel actually sends.
  //
  // No Allow-Credentials: the panel authenticates with a bearer token, not a
  // cookie, so nothing here should be sent with the browser's ambient
  // credentials — least of all while development echoes back localhost origins.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.test(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // One router per endpoint, mounted in the order a driver meets them. The
  // numbers on the folders are that order, so the list below and src/api read
  // the same way.
  const tokens = container.tokenService;
  const admins = container.adminUserRepository;

  app.use(configRoutes(container.config));
  app.use(requestOtpRoutes(container.requestOtp));
  app.use(signUpRoutes(container.signUp));
  app.use(verifyOtpRoutes(container.verifyOtp));
  app.use(sessionRoutes(container.session, tokens));
  app.use(refreshRoutes(container.refresh));
  app.use(documentsRoutes(container.documents, tokens));
  app.use(reviewRoutes(container.review, tokens));
  app.use(submitRoutes(container.submit, tokens));
  app.use(trackStatusRoutes(container.trackStatus, tokens));
  app.use(ridesRoutes(container.rides, tokens));
  app.use(earningsRoutes(container.earnings, tokens));
  app.use(profileRoutes(container.profile, tokens));
  app.use(ridePreferencesRoutes(container.ridePreferences, tokens));

  // The admin panel. Its own sign-in, and a token of its own kind, so a
  // driver's token can never reach any of it.
  app.use(adminAuthRoutes(container.adminAuth, tokens, admins));
  app.use(adminUsersRoutes(container.adminUsers, tokens, admins));
  app.use(adminConfigRoutes(container.adminConfig, tokens, admins));
  app.use(adminDriversRoutes(container.adminDrivers, tokens, admins));
  app.use(adminApplicationsRoutes(container.adminApplications, tokens, admins));

  app.use(notFoundHandler);
  app.use(errorHandler);

  // Handed back rather than attached here: the upgrade happens on the HTTP
  // server, which only main.ts has.
  return {
    app,
    realtime: {
      tokens,
      connections: container.connectionRegistry,
      realtime: container.realtimeService,
      shifts: container.shiftRepository,
    },
  };
}

type RealtimeDeps = Parameters<typeof import('./infrastructure/websocket/ws-gateway.js').attachWebSocket>[1];
