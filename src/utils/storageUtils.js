import { ref, uploadBytes, getDownloadURL, uploadString, deleteObject } from "firebase/storage";
import { storage } from "../firebase";

/**
 * Uploads a File object to a specified path in Firebase Storage.
 * @param {File} file - The file to upload.
 * @param {string} path - The storage path (e.g., "tenants/T1001/logo.png").
 * @returns {Promise<string>} - The public download URL.
 */
export const uploadFile = async (file, path) => {
    if (!file) return null;
    try {
        const storageRef = ref(storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
    } catch (error) {
        console.error("Storage upload error:", error);
        throw error;
    }
};

/**
 * Deletes a file from Firebase Storage by its path.
 * Silently ignores "not found" errors (object may have already been deleted).
 * @param {string} path - The storage path.
 */
export const deleteFile = async (path) => {
    if (!path) return;
    try {
        await deleteObject(ref(storage, path));
    } catch (error) {
        if (error.code !== "storage/object-not-found") {
            console.error("Storage delete error:", error);
        }
    }
};

/**
 * Uploads a Base64 string to a specified path in Firebase Storage.
 * Useful for migrating existing data or when dealing with data URLs.
 * @param {string} base64String - The data URL (header is automatically stripped).
 * @param {string} path - The storage path.
 * @returns {Promise<string>} - The public download URL.
 */
export const uploadBase64 = async (base64String, path) => {
    if (!base64String || !base64String.includes("base64,")) return base64String; // Return as is if already a URL
    try {
        const storageRef = ref(storage, path);
        const format = base64String.split(';')[0].split(':')[1]; // e.g. image/png
        const data = base64String.split(',')[1];
        const snapshot = await uploadString(storageRef, data, 'base64', { contentType: format });
        return await getDownloadURL(snapshot.ref);
    } catch (error) {
        console.error("Storage base64 upload error:", error);
        throw error;
    }
};
