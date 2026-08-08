import { B2StorageManager } from "../storage/b2-storage-manager";

export type DeliveryType = "BROWSER_DOWNLOAD" | "GOOGLE_DRIVE";
export type DeliveryStatus =
  | "PENDING"
  | "DELIVERING_DOWNLOAD"
  | "DELIVERING_DRIVE"
  | "DELIVERY_VERIFIED"
  | "DRIVE_UPLOAD_FAILED"
  | "TEMP_FILE_PURGED";

export interface DeliveryRecord {
  id: string;
  jobId: string;
  tenantId: string;
  userId: string;
  deliveryType: DeliveryType;
  status: DeliveryStatus;
  b2ObjectKey: string;
  downloadUrl?: string;
  googleDriveFileId?: string;
  createdAt: string;
  verifiedAt?: string;
  purgedAt?: string;
  error?: string;
}

export class DeliveryManager {
  private static deliveryRecords = new Map<string, DeliveryRecord>();

  static createDeliveryRecord(
    jobId: string,
    tenantId: string,
    userId: string,
    deliveryType: DeliveryType,
    b2ObjectKey: string
  ): DeliveryRecord {
    const id = `del_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const record: DeliveryRecord = {
      id,
      jobId,
      tenantId,
      userId,
      deliveryType,
      status: "PENDING",
      b2ObjectKey,
      createdAt: new Date().toISOString(),
    };

    this.deliveryRecords.set(id, record);
    return record;
  }

  static getSignedDownloadUrl(recordId: string, tenantId: string): string {
    const record = this.deliveryRecords.get(recordId);
    if (!record) throw new Error("Delivery record not found");
    if (record.tenantId !== tenantId) throw new Error("Unauthorized tenant access");

    const obj = B2StorageManager.getObject(record.b2ObjectKey, tenantId);
    if (!obj) throw new Error("B2 temporary render artifact expired or not found");

    record.status = "DELIVERING_DOWNLOAD";
    // Generate signed download URL (valid for remaining retention window)
    record.downloadUrl = `https://f000.backblazeb2.com/file/${B2StorageManager.getTelemetry().bucketName}/${record.b2ObjectKey}?token=signed_auth_token_${Date.now()}`;
    return record.downloadUrl;
  }

  static async exportToGoogleDrive(
    recordId: string,
    tenantId: string,
    simulateFailure = false
  ): Promise<DeliveryRecord> {
    const record = this.deliveryRecords.get(recordId);
    if (!record) throw new Error("Delivery record not found");
    if (record.tenantId !== tenantId) throw new Error("Unauthorized tenant access");

    const obj = B2StorageManager.getObject(record.b2ObjectKey, tenantId);
    if (!obj) throw new Error("B2 temporary render artifact expired or not found");

    record.status = "DELIVERING_DRIVE";

    if (simulateFailure) {
      // Golden Rule: If Drive upload fails, retain B2 artifact!
      record.status = "DRIVE_UPLOAD_FAILED";
      record.error = "Google Drive API timeout or authorization error";
      return record;
    }

    // Verified Drive Upload
    record.googleDriveFileId = `gdrive_file_${Date.now()}`;
    record.status = "DELIVERY_VERIFIED";
    record.verifiedAt = new Date().toISOString();

    // Post-delivery cleanup: delete temporary B2 artifact after delivery verification
    B2StorageManager.deleteObject(record.b2ObjectKey, tenantId);
    record.status = "TEMP_FILE_PURGED";
    record.purgedAt = new Date().toISOString();

    return record;
  }

  static getRecord(recordId: string, tenantId: string): DeliveryRecord | null {
    const record = this.deliveryRecords.get(recordId);
    if (!record || record.tenantId !== tenantId) return null;
    return record;
  }

  static clearRecordsForTesting() {
    this.deliveryRecords.clear();
  }
}
