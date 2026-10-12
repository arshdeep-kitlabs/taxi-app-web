import type { RowDataPacket } from 'mysql2/promise';
import type { Driver, Rejection } from '../../../domain/driver.js';
import { firstRow, type Database } from '../../../infrastructure/mysql/database.js';
import type { DriverRepository } from '../ports/driver-repository.port.js';
import { registeredTestNationalNumbers } from '../test-accounts.js';

interface Row extends RowDataPacket {
  id: string;
  driver_number: number;
  phone: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  accepted_terms_at: string | null;
  receive_promotions: number;
  created_at: string;
  application_status: Driver['applicationStatus'];
  reference: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejected_documents: unknown;
  rejection: unknown;
  city: string | null;
  rating: string | null;
  total_rides: number;
  earnings: string;
  account_status: Driver['accountStatus'];
  gender: Driver['gender'];
  gender_verified_at: string | null;
  gender_specific_mode_enabled: number;
  passenger_gender_preference: Driver['passengerGenderPreference'];
}

/** What a write sends. driver_number is the database's to assign. */
const COLUMNS = `id, phone, email, first_name, last_name, date_of_birth,
  accepted_terms_at, receive_promotions, created_at, application_status,
  reference, submitted_at, reviewed_at, rejected_documents, rejection,
  city, rating, total_rides, earnings, account_status,
  gender, gender_verified_at, gender_specific_mode_enabled,
  passenger_gender_preference`;

const READ_COLUMNS = `driver_number, ${COLUMNS}`;

/**
 * One placeholder per column, counted from COLUMNS rather than written out.
 * A hand-kept list silently goes wrong the first time a column is added.
 */
const PLACEHOLDERS = COLUMNS.split(',')
  .map(() => '?')
  .join(', ');

/** MySQL hands DATETIME back without a zone; the API speaks ISO throughout. */
const toIso = (value: string | null): string | null =>
  value === null ? null : new Date(`${value.replace(' ', 'T')}Z`).toISOString();

/** The columns are DATETIME(3), so the milliseconds go in rather than being lost. */
const toMysqlDateTime = (value: string | null): string | null =>
  value === null ? null : new Date(value).toISOString().slice(0, 23).replace('T', ' ');

export class MysqlDriverRepository implements DriverRepository {
  constructor(private readonly db: Database) {}

  private static toDriver(row: Row): Driver {
    return {
      id: row.id,
      number: row.driver_number,
      phone: row.phone,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      dateOfBirth: row.date_of_birth,
      acceptedTermsAt: toIso(row.accepted_terms_at),
      // MySQL has no boolean; it is stored as 0 or 1 and read back as one.
      receivePromotions: row.receive_promotions === 1,
      createdAt: toIso(row.created_at)!,
      applicationStatus: row.application_status,
      reference: row.reference,
      submittedAt: toIso(row.submitted_at),
      reviewedAt: toIso(row.reviewed_at),
      // A JSON column comes back parsed on some drivers and as text on others.
      rejectedDocuments:
        typeof row.rejected_documents === 'string'
          ? (JSON.parse(row.rejected_documents) as string[])
          : ((row.rejected_documents ?? []) as string[]),
      rejection:
        typeof row.rejection === 'string'
          ? (JSON.parse(row.rejection) as Rejection)
          : ((row.rejection ?? null) as Rejection | null),
      city: row.city,
      // DECIMAL arrives as a string, so it is read back as the number it is.
      rating: row.rating === null ? null : Number(row.rating),
      totalRides: row.total_rides,
      earnings: Number(row.earnings),
      accountStatus: row.account_status,
      gender: row.gender,
      genderVerifiedAt: toIso(row.gender_verified_at),
      genderSpecificModeEnabled: row.gender_specific_mode_enabled === 1,
      passengerGenderPreference: row.passenger_gender_preference,
    };
  }

  async listAll(): Promise<Driver[]> {
    const [rows] = await this.db.query<Row[]>(`SELECT ${READ_COLUMNS} FROM drivers`);
    return rows.map((row) => MysqlDriverRepository.toDriver(row));
  }

  private async find(where: string, value: string): Promise<Driver | null> {
    const row = await firstRow<Row>(
      this.db,
      `SELECT ${READ_COLUMNS} FROM drivers WHERE ${where} LIMIT 1`,
      [value],
    );
    return row ? MysqlDriverRepository.toDriver(row) : null;
  }

  async findById(id: string): Promise<Driver | null> {
    return this.find('id = ?', id);
  }

  async findByPhone(phone: string): Promise<Driver | null> {
    return this.find('phone = ?', phone);
  }

  async findByEmail(email: string): Promise<Driver | null> {
    // The column collates case-insensitively, the way a person expects an
    // address to match.
    return this.find('email = ?', email.trim());
  }

  async findByReference(reference: string): Promise<Driver | null> {
    return this.find('reference = ?', reference);
  }

  async create(driver: Driver): Promise<Driver> {
    await this.write(driver);
    // Read it back for the number the database just assigned.
    return (await this.findById(driver.id)) ?? driver;
  }

  async update(driver: Driver): Promise<Driver> {
    return this.write(driver);
  }

  /**
   * One statement for both, so a create and an update can never drift apart.
   * The row is addressed by id, which never changes once issued.
   */
  private async write(driver: Driver): Promise<Driver> {
    await this.db.query(
      `INSERT INTO drivers (${COLUMNS})
       VALUES (${PLACEHOLDERS})
       ON DUPLICATE KEY UPDATE
         phone = VALUES(phone),
         email = VALUES(email),
         first_name = VALUES(first_name),
         last_name = VALUES(last_name),
         date_of_birth = VALUES(date_of_birth),
         accepted_terms_at = VALUES(accepted_terms_at),
         receive_promotions = VALUES(receive_promotions),
         application_status = VALUES(application_status),
         reference = VALUES(reference),
         submitted_at = VALUES(submitted_at),
         reviewed_at = VALUES(reviewed_at),
         rejected_documents = VALUES(rejected_documents),
         rejection = VALUES(rejection),
         city = VALUES(city),
         rating = VALUES(rating),
         total_rides = VALUES(total_rides),
         earnings = VALUES(earnings),
         account_status = VALUES(account_status),
         gender = VALUES(gender),
         gender_verified_at = VALUES(gender_verified_at),
         gender_specific_mode_enabled = VALUES(gender_specific_mode_enabled),
         passenger_gender_preference = VALUES(passenger_gender_preference)`,
      [
        driver.id,
        driver.phone,
        driver.email,
        driver.firstName,
        driver.lastName,
        driver.dateOfBirth,
        toMysqlDateTime(driver.acceptedTermsAt),
        driver.receivePromotions ? 1 : 0,
        toMysqlDateTime(driver.createdAt),
        driver.applicationStatus,
        driver.reference,
        toMysqlDateTime(driver.submittedAt),
        toMysqlDateTime(driver.reviewedAt),
        JSON.stringify(driver.rejectedDocuments),
        // null rather than 'null', so the column is empty and not the word.
        driver.rejection === null ? null : JSON.stringify(driver.rejection),
        driver.city,
        driver.rating,
        driver.totalRides,
        driver.earnings,
        driver.accountStatus,
        driver.gender,
        toMysqlDateTime(driver.genderVerifiedAt),
        driver.genderSpecificModeEnabled ? 1 : 0,
        driver.passengerGenderPreference,
      ],
    );

    return driver;
  }

  /**
   * Registers half the reserved range, so a tester can reach both branches of
   * the sign-in screen without creating an account first. Called from the
   * container only when test accounts are enabled.
   */
  async seedTestDrivers(dialCode: string): Promise<void> {
    for (const national of registeredTestNationalNumbers()) {
      const phone = `${dialCode}${national}`;
      if (await this.findByPhone(phone)) continue;

      await this.write({
        id: `drv_test_${national}`,
        number: 0,
        phone,
        email: null,
        firstName: 'Test',
        lastName: `Driver ${national.slice(-1)}`,
        dateOfBirth: null,
        acceptedTermsAt: null,
        receivePromotions: false,
        createdAt: new Date().toISOString(),
        applicationStatus: 'draft',
        reference: null,
        submittedAt: null,
        reviewedAt: null,
        rejectedDocuments: [],
        rejection: null,
        city: null,
        rating: null,
        totalRides: 0,
        earnings: 0,
        accountStatus: 'active',
        gender: null,
        genderVerifiedAt: null,
        genderSpecificModeEnabled: false,
        passengerGenderPreference: 'ANY',
      });
    }
  }
}
