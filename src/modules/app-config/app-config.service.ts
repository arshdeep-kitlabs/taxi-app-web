import { AppError } from '../../common/errors/app.error.js';
import { ConfigInvalidError } from './app-config.schema.js';
import type { AppConfig, AppConfigResponse } from './app-config.types.js';
import type { ConfigSource } from './ports/config-source.port.js';
import type { ConfigWriter } from './ports/config-writer.port.js';

/**
 * What the app needs before its first screen paints.
 *
 * The stored configuration holds far more than this — the document checklist,
 * the OTP timings, the sign-in methods. Those reach the app through the
 * endpoint that uses them, so this response carries only what every screen
 * needs from the very first frame.
 */
export class AppConfigService {
  constructor(
    private readonly source: ConfigSource,
    /** Only the admin endpoints are given this; nothing else can write. */
    private readonly writer: ConfigWriter,
  ) {}

  /**
   * The whole stored document, for the admin panel's configuration screen.
   *
   * Everything, not the startup slice: the screen edits the document, so it
   * has to see all of it or a save would drop whatever it was not shown.
   */
  full(): AppConfig {
    return this.source.load();
  }

  /**
   * Replaces the whole document.
   *
   * Whole rather than partial, because a merge has no answer for a removed
   * country or a reordered document list — the panel holds the document it
   * loaded and sends it back entire.
   *
   * A rejected edit comes back as a field map keyed by path, so the form marks
   * the control rather than showing one sentence about a file.
   */
  async replace(raw: unknown): Promise<AppConfig> {
    try {
      return await this.writer.save(raw);
    } catch (cause) {
      if (cause instanceof ConfigInvalidError) {
        throw AppError.validation(
          Object.fromEntries(cause.issues.map((issue) => [issue.path, issue.message])),
        );
      }
      throw cause;
    }
  }

  getStartupConfig(): AppConfigResponse {
    const config = this.source.load();

    return {
      branding: {
        appName: config.branding.appName,
        logoUrl: config.branding.logoUrl,
      },
      theme: {
        backgroundColor: config.theme.colors.pageBackground,
        foregroundColor: config.theme.colors.text,
        themeColor: config.theme.colors.accent,
      },
      legal: {
        termOfServiceUrls: config.legal.terms.url,
        privacyPolicyUrls: config.legal.privacy.url,
      },
      money: config.money,
      support: config.support,
      features: {
        phoneSignIn: config.features.phoneSignIn,
        emailSignIn: config.features.emailSignIn,
        socialSignIn: config.features.socialSignIn,
        genderPreference: config.features.genderPreference,
      },
      minimumAppVersion: config.minimumAppVersion,
    };
  }
}
