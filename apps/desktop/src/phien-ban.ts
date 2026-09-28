/** Thông tin phiên bản, bản quyền (giá trị phiên bản do vite.config.ts điền lúc build). */
declare const __PHIEN_BAN__: string;
declare const __NGAY_BUILD__: string;
declare const __MA_BUILD__: string;

export const PHIEN_BAN = typeof __PHIEN_BAN__ === "string" ? __PHIEN_BAN__ : "0.0.0";
export const NGAY_BUILD = typeof __NGAY_BUILD__ === "string" ? __NGAY_BUILD__ : "";
export const MA_BUILD = typeof __MA_BUILD__ === "string" ? __MA_BUILD__ : "";

/** "Phiên bản 0.3.0 (28/09/2026)" */
export const moTaPhienBan = () => `Phiên bản ${PHIEN_BAN}${NGAY_BUILD ? ` (${NGAY_BUILD.split("-").reverse().join("/")})` : ""}`;

export const BAN_QUYEN = {
  tacGia: "Lê Tùng Lâm",
  donVi: "Sở Nông nghiệp và Môi trường tỉnh Sơn La",
  dienThoai: "0987559092",
  nam: "2026",
};
