// Search Images Component
// Provides image search functionality with lightbox gallery view
// Handles API calls to backend image search endpoint and displays results in a grid layout

import { ImagesIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { Message } from "./ChatWindow";

/**
 * Image search result structure from backend API
 * 
 * @property url - Source page URL
 * @property img_src - Direct image URL for display
 * @property title - Image title or description
 */
type Image = {
  url: string;
  img_src: string;
  title: string;
};

const SearchImages = ({
  query,
  chat_history,
}: {
  query: string;
  chat_history: Message[];
}) => {
  const [images, setImages] = useState<Image[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [slides, setSlides] = useState<{ src: string }[]>([]);
  const [currentQuery, setCurrentQuery] = useState<string>("");

  console.log("[SearchImages] Component rendered with query:", query);
  console.log("[SearchImages] Loading state:", loading);
  console.log("[SearchImages] Images state:", images);

  // Reset images when query changes
  if (currentQuery !== query && currentQuery !== "") {
    console.log("[SearchImages] Query changed, resetting images");
    setImages(null);
    setSlides([]);
  }

  return (
    <>
      {!loading && (images === null || (Array.isArray(images) && images.length === 0)) && (
        <button
          onClick={async () => {
            console.log("[SearchImages] Button clicked! Starting API call...");
            setLoading(true);
            setCurrentQuery(query); // Track current query
            
            // Reset previous data
            setImages(null);
            setSlides([]);
            
            try {
              console.log("[SearchImages] Making fetch request to:", `${process.env.NEXT_PUBLIC_API_URL}/images`);
              const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/images`,
                {
                  method: "POST",
                  headers: {
                    "Content-type": "application/json",
                  },
                  body: JSON.stringify({
                    query: query,
                    chat_history: chat_history,
                  }),
                }
              );

              console.log("[SearchImages] Response status:", res.status);
              const data = await res.json();
              console.log("[SearchImages] Response data:", data);

              const fetchedImages = data.images;
              
              // Validate fetched images
              if (Array.isArray(fetchedImages) && fetchedImages.length > 0) {
                setImages(fetchedImages);
                
                // Create slides with proper validation
                const validSlides = fetchedImages
                  .filter((image: Image) => image && image.img_src)
                  .map((image: Image) => ({
                    src: image.img_src,
                  }));
                
                setSlides(validSlides);
                console.log("[SearchImages] API call completed successfully with", fetchedImages.length, "images");
              } else {
                console.log("[SearchImages] No valid images found or empty response");
                // Set to null to show the button again, not empty array
                setImages(null);
                setSlides([]);
              }
              
              setLoading(false);
            } catch (error) {
              console.error("[SearchImages] API call failed:", error);
              // Set to null to show the button again, allowing retry
              setImages(null);
              setSlides([]);
              setLoading(false);
            }
          }}
          className="border border-dashed border-[#1C1C1C] hover:bg-[#1c1c1c] active:scale-95 duration-200 transition px-4 py-2 flex flex-row items-center justify-between rounded-lg text-white text-sm w-full"
        >
          <div className="flex flex-row items-center space-x-2">
            <ImagesIcon size={17} />
            <p>Search images</p>
          </div>
          <PlusIcon className="text-[#24A0ED]" size={17} />
        </button>
      )}
      {loading && (
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-[#1C1C1C] h-32 w-full rounded-lg animate-pulse aspect-video object-cover"
            />
          ))}
        </div>
      )}
      {Array.isArray(images) && images.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {images.length > 4
              ? images.slice(0, 3).map((image, i) => (
                  <Image
                    onClick={() => {
                      setOpen(true);
                      // Safely reorder slides with bounds checking
                      if (slides && slides.length > i) {
                        setSlides([
                          slides[i],
                          ...slides.slice(0, i),
                          ...slides.slice(i + 1),
                        ]);
                      }
                    }}
                    key={`${image.url}-${i}`}
                    src={image.img_src}
                    alt={image.title || "Search result image"}
                    width={640}
                    height={360}
                    className="h-full w-full aspect-video object-cover rounded-lg transition duration-200 active:scale-95 cursor-zoom-in hover:scale-[1.02]"
                  />
                ))
              : images.map((image, i) => (
                  <Image
                    onClick={() => {
                      setOpen(true);
                      // Safely reorder slides with bounds checking
                      if (slides && slides.length > i) {
                        setSlides([
                          slides[i],
                          ...slides.slice(0, i),
                          ...slides.slice(i + 1),
                        ]);
                      }
                    }}
                    key={`${image.url}-${i}`}
                    src={image.img_src}
                    alt={image.title || "Search result image"}
                    width={640}
                    height={360}
                    className="h-full w-full aspect-video object-cover rounded-lg transition duration-200 active:scale-95 cursor-zoom-in hover:scale-[1.02]"
                  />
                ))}
            {images.length > 4 && (
              <button
                onClick={() => setOpen(true)}
                className="
              bg-[#111111] hover:bg-[#1c1c1c] transition duration-200 active:scale-95 h-auto w-full rounded-lg flex flex-col justify-between text-white p-2 hover:scale-[1.02]"
              >
                <div className="flex flex-row items-center space-x-1">
                  {images.slice(3, 6).map((image, i) => (
                    <Image
                      key={i}
                      src={image.img_src}
                      alt={image.title}
                      width={120}
                      height={60}
                      className="h-6 w-12 rounded-md lg:h-3 lg:w-6 aspect-video object-cover"
                    />
                  ))}
                </div>
                <p className="text-white/70 text-xs">
                  View {images.length - 3} more
                </p>
              </button>
            )}
          </div>
          <Lightbox open={open} close={() => setOpen(false)} slides={slides} />
        </>
      )}
    </>
  );
};

export default SearchImages;