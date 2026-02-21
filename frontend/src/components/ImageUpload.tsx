import React, { useState, ChangeEvent, FormEvent } from "react";
import axios from "axios";

export default function ImageUpload(): JSX.Element {
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);

  // Environment-driven configuration
  const CLOUD_NAME =
    (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined) || "";
  const UPLOAD_PRESET =
    (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined) || "";

  // Backend fallback endpoint (your existing backend upload route)
  const BACKEND_UPLOAD_ENDPOINT =
    (import.meta.env.VITE_API_URL as string | undefined)
      ? `${(import.meta.env.VITE_API_URL as string).replace(/\/$/, "")}/upload`
      : "http://localhost:3000/upload";

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setImage(file);
    setImageUrl("");
    setProgress(0);
  };

  const uploadToCloudinary = async (file: File) => {
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);
    // optional: fd.append('folder', 'your-folder');

    const res = await axios.post(url, fd, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (event.total)
          setProgress(Math.round((event.loaded * 100) / event.total));
      },
    });
    // Cloudinary returns secure_url
    return (res.data && (res.data.secure_url || res.data.url)) as
      | string
      | undefined;
  };

  const uploadToBackend = async (file: File) => {
    const fd = new FormData();
    fd.append("image", file);

    const res = await axios.post(BACKEND_UPLOAD_ENDPOINT, fd, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (event.total)
          setProgress(Math.round((event.loaded * 100) / event.total));
      },
    });

    // Accept common shapes from backend: { url } or { imageUrl } or { path }
    const data = res.data || {};
    return (
      (data.url as string) ||
      (data.imageUrl as string) ||
      (data.path as string) ||
      ""
    );
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!image) {
      alert("Please select an image first!");
      return;
    }

    setUploading(true);
    setProgress(0);
    setImageUrl("");

    try {
      let url = "";

      if (CLOUD_NAME && UPLOAD_PRESET) {
        // Prefer direct Cloudinary unsigned upload when configured
        url = (await uploadToCloudinary(image)) || "";
      } else {
        // Fallback to backend upload
        url = (await uploadToBackend(image)) || "";
      }

      if (!url) {
        alert("Upload succeeded but no image URL was returned.");
      } else {
        setImageUrl(url);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed!");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 text-center">
      <h2 className="text-lg font-semibold mb-4">Upload Image</h2>

      <form
        onSubmit={handleUpload}
        className="flex items-center justify-center gap-3"
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded"
          disabled={!image || uploading}
        >
          {uploading
            ? `Uploading${progress ? ` (${progress}%)` : "..."}`
            : "Upload"}
        </button>
      </form>

      {progress > 0 && progress < 100 && (
        <div className="mt-2 text-sm text-gray-600">
          Progress: {progress}%
        </div>
      )}

      {imageUrl && (
        <div className="mt-4">
          <p className="text-sm text-green-700">✅ Uploaded Successfully!</p>
          <img
            src={imageUrl}
            alt="Uploaded"
            width={250}
            className="rounded border border-gray-200 mt-2"
          />
          <div className="mt-2 text-sm break-all">{imageUrl}</div>
        </div>
      )}

      {!CLOUD_NAME || !UPLOAD_PRESET ? (
        <div className="mt-4 text-xs text-gray-500">
          Note: Cloudinary not configured. Falling back to backend upload endpoint.
        </div>
      ) : null}
    </div>
  );
}