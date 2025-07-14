import { supabase } from "./supabase"

/**
 * Uploads a file to a Supabase storage bucket.
 * @param bucketName The name of the storage bucket.
 * @param file The File object to upload.
 * @param path The path where the file should be stored in the bucket (e.g., 'avatars/user1.png').
 * @returns The public URL of the uploaded file or an error.
 */
export async function uploadFile(
  bucketName: string,
  file: File,
  path: string,
): Promise<{ url?: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage.from(bucketName).upload(path, file, {
      cacheControl: "3600",
      upsert: true, // Overwrite if file exists
    })

    if (error) {
      console.error("Supabase file upload error:", error)
      return { error: error.message }
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(path)

    if (!publicUrlData || !publicUrlData.publicUrl) {
      return { error: "Failed to get public URL after upload." }
    }

    return { url: publicUrlData.publicUrl }
  } catch (e: any) {
    console.error("Unexpected file upload error:", e)
    return { error: e.message || "An unknown error occurred during file upload." }
  }
}

/**
 * Deletes a file from a Supabase storage bucket.
 * @param bucketName The name of the storage bucket.
 * @param path The path of the file to delete (e.g., 'avatars/user1.png').
 * @returns Success status or an error.
 */
export async function deleteFile(bucketName: string, path: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage.from(bucketName).remove([path])

    if (error) {
      console.error("Supabase file deletion error:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (e: any) {
    console.error("Unexpected file deletion error:", e)
    return { success: false, error: e.message || "An unknown error occurred during file deletion." }
  }
}
