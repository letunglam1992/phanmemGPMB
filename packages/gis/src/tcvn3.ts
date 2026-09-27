/**
 * Giải mã chữ tiếng Việt bảng mã TCVN3 (TCVN 5712:1993, bộ phông ".Vn…" / ABC)
 * thường dùng trong bản đồ địa chính MicroStation/Famis.
 *
 * Phông chữ hoa (.VnTimeH…) dùng cùng mã byte với chữ thường; tệp DGN không lưu
 * được thông tin phông nên phần mềm giải mã theo chữ thường.
 */

const BANG: Record<number, string> = {
  0xa1: "Ă", 0xa2: "Â", 0xa3: "Ê", 0xa4: "Ô", 0xa5: "Ơ", 0xa6: "Ư", 0xa7: "Đ",
  0xa8: "ă", 0xa9: "â", 0xaa: "ê", 0xab: "ô", 0xac: "ơ", 0xad: "ư", 0xae: "đ",
  0xb5: "à", 0xb6: "ả", 0xb7: "ã", 0xb8: "á", 0xb9: "ạ",
  0xbb: "ằ", 0xbc: "ẳ", 0xbd: "ẵ", 0xbe: "ắ", 0xc6: "ặ",
  0xc7: "ầ", 0xc8: "ẩ", 0xc9: "ẫ", 0xca: "ấ", 0xcb: "ậ",
  0xcc: "è", 0xce: "ẻ", 0xcf: "ẽ", 0xd0: "é", 0xd1: "ẹ",
  0xd2: "ề", 0xd3: "ể", 0xd4: "ễ", 0xd5: "ế", 0xd6: "ệ",
  0xd7: "ì", 0xd8: "ỉ", 0xdc: "ĩ", 0xdd: "í", 0xde: "ị",
  0xdf: "ò", 0xe1: "ỏ", 0xe2: "õ", 0xe3: "ó", 0xe4: "ọ",
  0xe5: "ồ", 0xe6: "ổ", 0xe7: "ỗ", 0xe8: "ố", 0xe9: "ộ",
  0xea: "ờ", 0xeb: "ở", 0xec: "ỡ", 0xed: "ớ", 0xee: "ợ",
  0xef: "ù", 0xf1: "ủ", 0xf2: "ũ", 0xf3: "ú", 0xf4: "ụ",
  0xf5: "ừ", 0xf6: "ử", 0xf7: "ữ", 0xf8: "ứ", 0xf9: "ự",
  0xfa: "ỳ", 0xfb: "ỷ", 0xfc: "ỹ", 0xfd: "ý", 0xfe: "ỵ",
};

export interface KetQuaGiaiMa {
  chu: string;
  /** Các byte không có trong bảng TCVN3 (giữ nguyên theo Latin-1). */
  byteLa: number[];
}

export function giaiMaTcvn3(bytes: Uint8Array | number[]): KetQuaGiaiMa {
  let chu = "";
  const byteLa: number[] = [];
  for (const b of bytes) {
    if (b === 0) break;
    if (b < 0x80) {
      chu += String.fromCharCode(b);
      continue;
    }
    const c = BANG[b];
    if (c) chu += c;
    else {
      byteLa.push(b);
      chu += String.fromCharCode(b);
    }
  }
  return { chu: chu.normalize("NFC"), byteLa };
}

/** Chuỗi có chứa byte thuộc vùng ký tự tiếng Việt TCVN3 hay không. */
export function coTheLaTcvn3(bytes: Uint8Array | number[]): boolean {
  for (const b of bytes) if (b >= 0xa1 && BANG[b]) return true;
  return false;
}
