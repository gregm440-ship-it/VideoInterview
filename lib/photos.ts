import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "./supabase";
import type { PhotoType } from "./database.types";
import {
  PHOTO_COMPRESS_QUALITY,
  PHOTO_MAX_WIDTH,
  REVIEW_PHOTOS_BUCKET,
} from "./constants";

export interface PendingPhoto {
  uri: string;
  type: PhotoType;
}

/** Compress client-side (~1080px / 0.7) to keep uploads fast and cheap (8.2). */
async function compress(uri: string): Promise<{ uri: string }> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: PHOTO_MAX_WIDTH } }],
    {
      compress: PHOTO_COMPRESS_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );
  return { uri: result.uri };
}

/**
 * Upload one photo to the review-photos bucket under <userId>/<reviewId>/...
 * (the path convention the Storage RLS policy enforces) and return its public URL.
 */
export async function uploadReviewPhoto(
  userId: string,
  reviewId: string,
  photo: PendingPhoto,
  index: number
): Promise<string> {
  const { uri } = await compress(photo.uri);

  // Read the local file as bytes for upload.
  const res = await fetch(uri);
  const arrayBuffer = await res.arrayBuffer();

  const path = `${userId}/${reviewId}/${photo.type}-${index}-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from(REVIEW_PHOTOS_BUCKET)
    .upload(path, arrayBuffer, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(REVIEW_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
