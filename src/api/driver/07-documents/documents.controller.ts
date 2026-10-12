import type { Request, Response } from 'express';
import { AppError } from '../../../common/errors/app.error.js';
import { success } from '../../../common/http/envelope.js';
import { driverId } from '../../../common/http/require-driver.js';
import { validate } from '../../../common/http/validate.js';
import type { DocumentsService } from '../../../modules/documents/documents.service.js';
import type { DocumentsState } from '../../../modules/documents/documents.types.js';
import type { VehicleDetailsService } from '../../../modules/vehicle/vehicle-details.service.js';
import { PatchDocumentsDto } from './documents.dto.js';

/**
 * PATCH /documents — every upload the driver makes, from every screen.
 *
 * Identity documents, vehicle documents and the car's typed details all come
 * through here, so there is one call to learn and one place a rule is checked.
 */
export class DocumentsController {
  constructor(
    private readonly documents: DocumentsService,
    private readonly details: VehicleDetailsService,
  ) {}

  patch = async (req: Request, res: Response): Promise<void> => {
    const { details, ...documents } = validate(PatchDocumentsDto, req.body);
    const driver = driverId(res);
    const hasDocuments = Object.keys(documents).length > 0;

    if (!details && !hasDocuments) {
      throw AppError.validation({ _: 'REQUIRED' });
    }

    // Details first: a rejected plate must not leave half the call applied.
    if (details) {
      await this.documents.assertEditable(driver);
      await this.details.save(driver, details);
    }

    const state = hasDocuments
      ? await this.documents.patch(driver, documents)
      : await this.documents.current(driver);

    res.json(success(toResponse(state)));
  };
}

/**
 * What the upload call reports back: which slots are filled, and the counts.
 *
 * The chosen type and the typed field values are left out. The app already
 * knows what it just sent, and GET /review is where they are read back.
 */
function toResponse(state: DocumentsState) {
  return {
    documents: state.documents.map((document) => ({
      name: document.name,
      images: document.images,
      complete: document.complete,
    })),
    imagesUploaded: state.imagesUploaded,
    imagesRequired: state.imagesRequired,
    canContinue: state.canContinue,
  };
}
