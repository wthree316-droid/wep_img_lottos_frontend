/**
 * Helper functions สำหรับจัดการรูปภาพ
 */

/**
 * โหลดรูปภาพล่วงหน้าเพื่อให้แน่ใจว่า cache แล้ว
 * @param src - URL ของรูปภาพ
 * @param timeoutMs - Timeout สำหรับการโหลด (default: 10 วินาที)
 */
export const preloadImage = (src: string, timeoutMs: number = 10000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!src) {
      resolve(true);
      return;
    }

    const img = new Image();
    const timer = setTimeout(() => {
      console.warn(`Image loading timeout: ${src}`);
      resolve(false);
    }, timeoutMs);

    img.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };

    img.onerror = () => {
      clearTimeout(timer);
      console.error(`Failed to load image: ${src}`);
      resolve(false);
    };

    img.src = src;
  });
};

/**
 * โหลดหลายรูปภาพพร้อมกัน
 */
export const preloadImages = async (sources: string[]): Promise<boolean[]> => {
  return Promise.all(sources.map(src => preloadImage(src)));
};

/**
 * รอให้ fonts โหลดเสร็จพร้อม timeout
 */
export const waitForFonts = (timeoutMs: number = 5000): Promise<boolean> => {
  return Promise.race([
    document.fonts.ready.then(() => true),
    new Promise<boolean>(resolve => setTimeout(() => resolve(false), timeoutMs))
  ]);
};
