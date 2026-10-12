import { AppError } from '../../common/errors/app.error.js';
import type { DocumentImageSlot, DocumentSpec } from '../app-config/app-config.types.js';
import type { ConfigSource } from '../app-config/ports/config-source.port.js';
import { resolveCountry } from '../auth/country-code.js';
import { toE164 } from '../auth/phone-number.js';
import type { DriverRepository } from '../auth/ports/driver-repository.port.js';
import type { TokenService } from '../auth/ports/token-service.port.js';
import type { DocumentsService } from '../documents/documents.service.js';
import type { DocumentState } from '../documents/documents.types.js';
import type {
  DocumentChoice,
  ImageRequirements,
  RequiredDocument,
  SessionAccess,
  SessionDocuments,
  SessionResult,
} from './session.types.js';
import type { VerifiedSessionRepository } from './ports/verified-session-repository.port.js';

/**
 * Everything the app needs about the signed-in driver, in one call.
 *
 * It returns fresh tokens, who the driver is, what they may do, and the whole
 * document checklist — so the app has one place to look rather than stitching
 * several calls together on launch.
 */
export class SessionService {
  constructor(
    private readonly verifiedSessions: VerifiedSessionRepository,
    private readonly drivers: DriverRepository,
    private readonly documents: DocumentsService,
    private readonly tokens: TokenService,
    private readonly config: ConfigSource,
  ) {}

  /**
   * The first call after /verifyOTP: spends the proof that the number was just
   * verified, and hands out the tokens.
   *
   * The proof is one-use and lasts two minutes, so a number cannot be turned
   * into a session long after the code was proved, nor twice.
   */
  async exchange(
    countryCode: string,
    phoneCode: string,
    phoneNumber: string,
  ): Promise<SessionResult> {
    const country = resolveCountry(countryCode, phoneCode, this.config.load().signIn.countries);
    const phone = toE164(country.dialCode, phoneNumber);

    const verified = await this.verifiedSessions.find(phone);
    if (!verified || verified.expiresAt < Date.now()) {
      throw new AppError(401, 'NOT_VERIFIED');
    }
    await this.verifiedSessions.remove(phone);

    return this.current(verified.driverId);
  }

  /** Every later launch: the same payload, for a driver who holds a token. */
  async current(driverId: string): Promise<SessionResult> {
    const driver = await this.drivers.findById(driverId);
    if (!driver) throw AppError.notFound('DRIVER_NOT_FOUND');

    const state = await this.documents.current(driverId);
    const documents = this.groupDocuments(state.documents);

    return {
      accessToken: this.tokens.issueAuthToken(driver.id),
      refreshToken: this.tokens.issueRefreshToken(driver.id),

      driver: {
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        email: driver.email,
        phone: driver.phone,
        dateOfBirth: driver.dateOfBirth,
        receivePromotions: driver.receivePromotions,
        createdAt: driver.createdAt,
      },

      access: this.accessFor(documents, state.documents),

      documents,
    };
  }

  /**
   * What the driver may do next.
   *
   * Derived rather than stored, so it cannot fall out of step with what has
   * actually been uploaded.
   */
  private accessFor(documents: SessionDocuments, state: DocumentState[]): SessionAccess {
    const complete = (list: RequiredDocument[]): boolean =>
      list
        .filter((document) => document.isMandatory)
        .every((document) => state.find((entry) => entry.name === document.id)?.complete === true);

    const identityComplete = complete(documents.identityDocuments);
    const vehicleComplete = complete(documents.vehicleDocuments);

    return {
      canUploadDocuments: 1,
      // The vehicle screen opens once the driver has proved who they are.
      canAddVehicle: identityComplete ? 1 : 0,
      canSubmitApplication: identityComplete && vehicleComplete ? 1 : 0,
    };
  }

  /** Two plain lists, one per screen, in the order configuration gives them. */
  private groupDocuments(state: DocumentState[]): SessionDocuments {
    const specs = this.config.load().documents.documents;
    const describe = (spec: DocumentSpec): RequiredDocument =>
      this.describeDocument(spec, state.find((entry) => entry.name === spec.name));

    return {
      identityDocuments: specs.filter((spec) => spec.collectedAt === 'identity').map(describe),
      vehicleDocuments: specs.filter((spec) => spec.collectedAt === 'vehicle').map(describe),
    };
  }

  private describeDocument(spec: DocumentSpec, state: DocumentState | undefined): RequiredDocument {
    // The photographs follow the chosen ID type — a passport asks for two where
    // a birth certificate asks for one. The choice is not sent back, but it
    // still decides which sides the card reports as required.
    const chosen = spec.typeOptions.find((option) => option.id === state?.type);
    const slots =
      spec.typeOptions.length > 0
        ? (chosen?.images ?? spec.typeOptions[0]?.images ?? [])
        : spec.images;

    return {
      id: spec.name,
      name: spec.label,
      info: spec.description,
      isMandatory: spec.isMandatory,
      documentChoices: spec.typeOptions.map(
        (option): DocumentChoice => ({
          id: option.id,
          name: option.label,
          info: option.description,
          // Each option carries its own, because they differ: a ration card is
          // one side and an Aadhaar card is two.
          ...SessionService.imagesFor(option.images),
        }),
      ),
      ...SessionService.imagesFor(slots),
    };
  }

  /** Which sides a set of slots asks for, as the flags the app reads. */
  private static imagesFor(slots: DocumentImageSlot[]): ImageRequirements {
    const has = (name: string): boolean => slots.some((slot) => slot.name === name);

    return {
      frontImageRequired: has('front'),
      backImageRequired: has('back'),
      // Only the profile photo asks for these, so they are left off every
      // other card rather than sent as false everywhere.
      ...(has('left') ? { leftImageRequired: true } : {}),
      ...(has('right') ? { rightImageRequired: true } : {}),
    };
  }
}
