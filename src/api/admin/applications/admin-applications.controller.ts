import type { Request, Response } from 'express';
import { success } from '../../../common/http/envelope.js';
import { AppError } from '../../../common/errors/app.error.js';
import { adminId } from '../../../common/http/require-admin.js';
import type { AdminService } from '../../../modules/admin/admin.service.js';
import type { ApplicationStatus } from '../../../domain/driver.js';
import type { ApplicationAction } from '../../../modules/admin/admin.types.js';

const STATUSES: ApplicationStatus[] = [
  'submitted',
  'in_review',
  'changes_requested',
  'approved',
  'rejected',
];

const VALID_ACTIONS = [
  'approve_application',
  'reject_application',
  'request_changes',
  'approve_document',
  'reject_document',
];

/**
 * Each entry must name a document and say why. `image` is the one optional
 * part: leaving it out means the whole document rather than one photograph.
 */
function checkDocumentEntries(documents: { id?: string; reason?: string }[]): void {
  documents.forEach((entry, index) => {
    if (!entry?.id) {
      throw AppError.validation({ [`documents.${index}.id`]: 'Required.' });
    }
    if (!entry?.reason) {
      // Without it the driver gets a card telling them nothing.
      throw AppError.validation({ [`documents.${index}.reason`]: 'Required.' });
    }
  });
}

export class AdminApplicationsController {
  constructor(private readonly service: AdminService) {}

  /** GET /admin/applications — list */
  list = async (req: Request, res: Response): Promise<void> => {
    const status = String(req.query.status ?? '') as ApplicationStatus;
    res.json(
      success(
        await this.service.applications({
          search: req.query.search ? String(req.query.search) : undefined,
          status: STATUSES.includes(status) ? status : undefined,
        }),
      ),
    );
  };

  /** GET /admin/applications/:driverId — full detail */
  detail = async (req: Request, res: Response): Promise<void> => {
    res.json(success(await this.service.applicationDetail(String(req.params['driverId']))));
  };

  /** PATCH /admin/applications/:driverId — all review actions */
  update = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as Partial<ApplicationAction>;

    if (!body.action || !VALID_ACTIONS.includes(body.action)) {
      throw AppError.validation({
        action: `Must be one of: ${VALID_ACTIONS.join(', ')}.`,
      });
    }

    if (body.action === 'reject_application') {
      if (!body.reason) {
        throw AppError.validation({ reason: 'Required when action is reject_application.' });
      }
      // Naming documents is optional here, but anything named still has to say
      // which one and why.
      if (body.documents !== undefined) {
        if (!Array.isArray(body.documents)) {
          throw AppError.validation({ documents: 'Must be an array when sent.' });
        }
        checkDocumentEntries(body.documents);
      }
    }

    if (body.action === 'request_changes') {
      if (!body.message) {
        throw AppError.validation({ message: 'Required when action is request_changes.' });
      }
      if (!Array.isArray(body.documents) || body.documents.length === 0) {
        throw AppError.validation({
          documents: 'Required and must be a non-empty array when action is request_changes.',
        });
      }
      checkDocumentEntries(body.documents);
    }

    if (body.action === 'approve_document' && !body.document) {
      throw AppError.validation({ document: 'Required when action is approve_document.' });
    }

    if (body.action === 'reject_document') {
      if (!body.document) {
        throw AppError.validation({ document: 'Required when action is reject_document.' });
      }
      if (!body.reviewNote) {
        throw AppError.validation({ reviewNote: 'Required when action is reject_document.' });
      }
    }

    const updated = await this.service.updateApplication(
      String(req.params['driverId']),
      body as ApplicationAction,
      adminId(res),
    );
    res.json(success(updated));
  };
}
