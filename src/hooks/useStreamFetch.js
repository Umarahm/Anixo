import { useState, useEffect } from "react";

/**
 * useStreamFetch
 * Fetches the stream iframe URL based on active episode, language, and server.
 * Supports 3 servers: Megaplay (MAL), Megaplay (AniList), Vidnest.
 * Manages streamUrl, streamData, loading, error, and iframe loaded states.
 */
export function useStreamFetch({
  id,
  anime,
  activeEpisode,
  playerLang,
  activeServer,
  autoPlay,
  episodesLength,
  setPageLoading,
  isMal,
  initialTime = 0,
}) {
  const [streamUrl, setStreamUrl] = useState("");
  const [streamData, setStreamData] = useState(null);
  const [streamLoading, setStreamLoading] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Sync global page loader with iframe loading
  useEffect(() => {
    if (
      iframeLoaded ||
      fetchError ||
      (streamUrl && streamData && !streamData.iframe_url && !streamLoading)
    ) {
      setTimeout(() => setPageLoading(false), 0);
    }
  }, [iframeLoaded, fetchError, streamUrl, streamData, streamLoading, setPageLoading]);

  // Clean up loading state on unmount
  useEffect(() => {
    return () => setPageLoading(false);
  }, [setPageLoading]);

  // Reset iframe loading state whenever the URL changes
  useEffect(() => {
    setTimeout(() => {
      if (streamUrl) {
        setIframeLoaded(false);
      } else {
        setIframeLoaded(true);
      }
    }, 0);
  }, [streamUrl]);

  // ── Main stream fetch logic ──
  useEffect(() => {
    let cancelled = false;

    const fetchStream = async () => {
      if (cancelled) return;

      console.info(
        `[Player] Fetching stream: Episode ${activeEpisode}, Lang: ${playerLang}, Server: ${activeServer}`
      );

      setStreamLoading(true);
      setPageLoading(true);
      setFetchError(null);
      setStreamUrl("");
      setStreamData(null);
      setIframeLoaded(false);

      // Force a tiny delay to ensure the iframe is completely destroyed in the DOM
      await new Promise((resolve) => setTimeout(resolve, 50));

      try {
        let url = "";

        // --- SERVER 1: MEGAPLAY (MAL ID) ---
        if (activeServer === 1) {
          const langParam =
            playerLang.toLowerCase() === "dub" ? "dub" : "sub";
          const megaBase =
            import.meta.env.VITE_MEGAPLAY_URL || "https://megaplay.buzz";

          if (anime?.idMal || isMal) {
            const malId = anime?.idMal || id;
            url = `${megaBase}/stream/mal/${malId}/${activeEpisode}/${langParam}`;
            setStreamData({ server_name: "SERVER 1 (MAL)", lang: langParam });
          } else if (anime?.id || !isMal) {
            const anilistId = anime?.id || id;
            url = `${megaBase}/stream/ani/${anilistId}/${activeEpisode}/${langParam}`;
            setStreamData({
              server_name: "SERVER 1 (AniList-Fallback)",
              lang: langParam,
            });
          } else {
            setFetchError("Stream ID not found. Try another server.");
          }
        }

        // --- SERVER 2: MEGAPLAY (AniList ID) ---
        else if (activeServer === 2) {
          const langParam =
            playerLang.toLowerCase() === "dub" ? "dub" : "sub";
          const megaBase =
            import.meta.env.VITE_MEGAPLAY_URL || "https://megaplay.buzz";

          const anilistId = anime?.id || (!isMal ? id : null);

          if (anilistId) {
            url = `${megaBase}/stream/ani/${anilistId}/${activeEpisode}/${langParam}`;
            setStreamData({
              server_name: "SERVER 2 (AniList)",
              lang: langParam,
            });
          } else if (anime?.idMal || isMal) {
            const malId = anime?.idMal || id;
            url = `${megaBase}/stream/mal/${malId}/${activeEpisode}/${langParam}`;
            setStreamData({
              server_name: "SERVER 2 (MAL-Fallback)",
              lang: langParam,
            });
          } else {
            setFetchError("Stream ID not found. Try another server.");
          }
        }

        // --- SERVER 3: TRYEMBED (AniList ID) ---
        else if (activeServer === 3) {
          const langParam =
            playerLang.toLowerCase() === "dub" ? "dub" : "sub";
          const anilistId = anime?.id || (!isMal ? id : null);

          if (anilistId) {
            const queryParams = [];
            if (autoPlay) {
              queryParams.push("autoplay=true");
            }
            queryParams.push("autoSkip=true");
            queryParams.push("autoNext=false");
            queryParams.push("lang-type=false");
            
            if (initialTime && initialTime > 0) {
              queryParams.push(`startAt=${Math.floor(initialTime)}`);
            }

            const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
            url = `https://tryembed.us.cc/embed/anime/${anilistId}/${activeEpisode}/${langParam}${queryString}`;

            setStreamData({
              server_name: "SERVER 3 (Tryembed)",
              lang: langParam,
            });
          } else {
            setFetchError(
              "AniList ID is required for Server 3. Try another server."
            );
          }
        }

        // --- SERVER 4: VIDNEST (AniList ID - Embed Anime) ---
        else if (activeServer === 4) {
          const langParam =
            playerLang.toLowerCase() === "dub" ? "dub" : "sub";
          const anilistId = anime?.id || (!isMal ? id : null);

          if (anilistId) {
            url = `https://vidnest.fun/anime/${anilistId}/${activeEpisode}/${langParam}`;
            setStreamData({
              server_name: "SERVER 4 (Vidnest)",
              lang: langParam,
            });
          } else {
            setFetchError(
              "AniList ID is required for Server 4. Try another server."
            );
          }
        }

        if (url) {
          if (activeServer === 3 || activeServer === 4) {
            // Keep Vidnest and Tryembed URLs clean without Megaplay-specific parameters
            setStreamUrl(url);
          } else {
            // Inject Autoplay and premium params for Megaplay
            try {
              const urlObj = new URL(url);
              if (autoPlay) {
                urlObj.searchParams.set("autoplay", "1");
                urlObj.searchParams.set("muted", "1");
              } else {
                urlObj.searchParams.set("muted", "0");
              }

              // Cache buster & language override
              urlObj.searchParams.set("cb", Date.now().toString());
              urlObj.searchParams.set("lang", playerLang.toLowerCase());
              urlObj.searchParams.set("audio", playerLang.toLowerCase());

              const finalUrl = `${urlObj.toString()}#lang=${playerLang}`;
              setStreamUrl(finalUrl);
            } catch {
              const finalUrl = `${url}${url.includes("?") ? "&" : "?"}cb=${Date.now()}#lang=${playerLang}`;
              setStreamUrl(finalUrl);
            }
          }
        } else {
          setFetchError("Stream link not found for this server.");
        }
      } catch (err) {
        console.error(`[Player] Server ${activeServer} Fetch Error:`, err);
        setFetchError(
          err.response?.data?.error ||
            "Failed to fetch stream. Try another server."
        );
      } finally {
        setStreamLoading(false);
      }
    };

    fetchStream();

    return () => {
      cancelled = true;
    };
  }, [
    id,
    anime?.id,
    anime?.idMal,
    activeEpisode,
    playerLang,
    activeServer,
    autoPlay,
    episodesLength,
    setPageLoading,
    isMal,
    initialTime,
  ]);

  return {
    streamUrl,
    streamData,
    streamLoading,
    fetchError,
    iframeLoaded,
    setIframeLoaded,
  };
}
