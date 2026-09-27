import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { BoChinhSach } from "@gpmb/core";
import { BO_CHINH_SACH } from "./du-lieu";
import { taoKhoIndexedDb, type Kho } from "./kho";
import type { DuAn, Ho } from "./mo-hinh";

export type Man =
  | { ten: "tong-quan" }
  | { ten: "du-an"; duAnId: string }
  | { ten: "ho"; duAnId: string; hoId: string; tab?: string }
  | { ten: "ban-do"; duAnId: string }
  | { ten: "tra-cuu" };

interface NguCanh {
  kho: Kho;
  dsDuAn: DuAn[];
  hoCua: (duAnId: string) => Ho[];
  man: Man;
  di: (m: Man) => void;
  luuDuAn: (d: DuAn) => Promise<void>;
  luuHo: (h: Ho, nhatKy?: string) => Promise<void>;
  xoaHo: (id: string) => Promise<void>;
  xoaDuAn: (id: string) => Promise<void>;
  chinhSach: (d: DuAn) => BoChinhSach;
  dangTai: boolean;
  nguoiDung: string;
}

const Ctx = createContext<NguCanh | null>(null);

export function useUngDung(): NguCanh {
  const c = useContext(Ctx);
  if (!c) throw new Error("Thiếu NguCanh");
  return c;
}

export function NhaCungCap({ children, kho: khoVao }: { children: ReactNode; kho?: Kho }) {
  const kho = useMemo(() => khoVao ?? taoKhoIndexedDb(), [khoVao]);
  const [dsDuAn, setDsDuAn] = useState<DuAn[]>([]);
  const [dsHo, setDsHo] = useState<Ho[]>([]);
  const [man, setMan] = useState<Man>({ ten: "tong-quan" });
  const [dangTai, setDangTai] = useState(true);
  const nguoiDung = "Cán bộ xã";

  const taiLai = useCallback(async () => {
    const da = await kho.dsDuAn();
    const hos = (await Promise.all(da.map((d) => kho.dsHo(d.id)))).flat();
    setDsDuAn(da.sort((a, b) => b.taoLuc.localeCompare(a.taoLuc)));
    setDsHo(hos.sort((a, b) => a.ma.localeCompare(b.ma, "vi", { numeric: true })));
    setDangTai(false);
  }, [kho]);

  useEffect(() => {
    void taiLai();
  }, [taiLai]);

  const giaTri: NguCanh = {
    kho,
    dsDuAn,
    hoCua: (id) => dsHo.filter((h) => h.duAnId === id),
    man,
    di: setMan,
    luuDuAn: async (d) => {
      await kho.luuDuAn(d);
      await taiLai();
    },
    luuHo: async (h, nk) => {
      const ban = nk ? { ...h, nhatKy: [...h.nhatKy, { luc: new Date().toISOString(), nguoi: nguoiDung, noiDung: nk }] } : h;
      await kho.luuHo(ban);
      await taiLai();
    },
    xoaHo: async (id) => {
      await kho.xoaHo(id);
      await taiLai();
    },
    xoaDuAn: async (id) => {
      await kho.xoaDuAn(id);
      await taiLai();
    },
    chinhSach: (d) => BO_CHINH_SACH[d.boChinhSach] ?? BO_CHINH_SACH["sonla-2026-03-31"]!,
    dangTai,
    nguoiDung,
  };
  return <Ctx.Provider value={giaTri}>{children}</Ctx.Provider>;
}
