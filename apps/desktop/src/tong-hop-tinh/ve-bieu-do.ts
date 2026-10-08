/**
 * 1.0.6 — Vẽ biểu đồ đường "tỷ lệ hộ đã bàn giao, đã duyệt phương án theo tháng" thành PNG để chèn vào báo cáo Word
 * (in đen trắng vẫn phân biệt: đường liền / đường đứt, điểm tròn / vuông). Vẽ bằng canvas trên máy.
 */
export interface DiemDienBien {
  ky: string; // yyyy-mm
  banGiao: number; // %
  duyetPA: number; // %
}

export async function veBieuDoDienBien(ds: DiemDienBien[], rong = 1500, cao = 650): Promise<Uint8Array | null> {
  if (ds.length < 2 || typeof document === "undefined") return null;
  const cv = document.createElement("canvas");
  cv.width = rong;
  cv.height = cao;
  const c = cv.getContext("2d");
  if (!c) return null;
  const font = (px: number, dam = false) => `${dam ? "bold " : ""}${px}px "Times New Roman", serif`;
  c.fillStyle = "#fff";
  c.fillRect(0, 0, rong, cao);
  const L = { trai: 90, phai: 40, tren: 70, duoi: 80 };
  const w = rong - L.trai - L.phai, h = cao - L.tren - L.duoi;
  const x = (i: number) => L.trai + (ds.length === 1 ? w / 2 : (i * w) / (ds.length - 1));
  const y = (v: number) => L.tren + h - (Math.max(0, Math.min(100, v)) / 100) * h;
  // lưới, trục tung
  c.strokeStyle = "#ccc";
  c.lineWidth = 1;
  c.fillStyle = "#333";
  c.font = font(24);
  c.textAlign = "right";
  c.textBaseline = "middle";
  for (let v = 0; v <= 100; v += 20) {
    c.beginPath();
    c.moveTo(L.trai, y(v));
    c.lineTo(L.trai + w, y(v));
    c.stroke();
    c.fillText(`${v}%`, L.trai - 10, y(v));
  }
  // nhãn tháng (thưa bớt khi nhiều)
  c.textAlign = "center";
  c.textBaseline = "top";
  const buoc = Math.ceil(ds.length / 12);
  ds.forEach((d, i) => {
    if (i % buoc === 0 || i === ds.length - 1) c.fillText(`${d.ky.slice(5)}/${d.ky.slice(2, 4)}`, x(i), L.tren + h + 12);
  });
  const chuoi: { ten: string; lay: (d: DiemDienBien) => number; mau: string; dut: number[]; diem: "tron" | "vuong" }[] = [
    { ten: "Tỷ lệ hộ đã bàn giao mặt bằng", lay: (d) => d.banGiao, mau: "#1f4e79", dut: [], diem: "tron" },
    { ten: "Tỷ lệ hộ đã duyệt phương án", lay: (d) => d.duyetPA, mau: "#c55a11", dut: [14, 10], diem: "vuong" },
  ];
  for (const s of chuoi) {
    c.strokeStyle = s.mau;
    c.fillStyle = s.mau;
    c.lineWidth = 5;
    c.setLineDash(s.dut);
    c.beginPath();
    ds.forEach((d, i) => (i ? c.lineTo(x(i), y(s.lay(d))) : c.moveTo(x(i), y(s.lay(d)))));
    c.stroke();
    c.setLineDash([]);
    ds.forEach((d, i) => {
      if (s.diem === "tron") {
        c.beginPath();
        c.arc(x(i), y(s.lay(d)), 8, 0, Math.PI * 2);
        c.fill();
      } else c.fillRect(x(i) - 8, y(s.lay(d)) - 8, 16, 16);
    });
    // nhãn giá trị điểm cuối
    const cuoi = ds[ds.length - 1]!;
    c.font = font(24, true);
    c.textAlign = "right";
    c.textBaseline = "bottom";
    c.fillText(`${s.lay(cuoi).toFixed(1).replace(".", ",").replace(/,0$/, "")}%`, x(ds.length - 1) - 12, y(s.lay(cuoi)) - 10);
  }
  // chú giải
  c.font = font(26);
  c.textAlign = "left";
  c.textBaseline = "middle";
  let lx = L.trai;
  for (const s of chuoi) {
    c.strokeStyle = s.mau;
    c.lineWidth = 5;
    c.setLineDash(s.dut);
    c.beginPath();
    c.moveTo(lx, 30);
    c.lineTo(lx + 60, 30);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = "#222";
    c.fillText(s.ten, lx + 72, 30);
    lx += 72 + c.measureText(s.ten).width + 50;
  }
  const blob = await new Promise<Blob | null>((ok) => cv.toBlob(ok, "image/png"));
  return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
}
