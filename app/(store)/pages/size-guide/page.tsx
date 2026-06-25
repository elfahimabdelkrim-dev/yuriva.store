import type { Metadata } from "next";
import Breadcrumb from "@/components/ui/Breadcrumb";

export const metadata: Metadata = { title: "دليل القياسات | YURIVA" };

const SIZES = [
  { size: "M", weight: "55-65kg", waist: "76-82 سم", hip: "86-92 سم" },
  { size: "L", weight: "65-75kg", waist: "82-88 سم", hip: "92-98 سم" },
  { size: "XL", weight: "75-85kg", waist: "88-96 سم", hip: "98-106 سم" },
  { size: "XXL", weight: "85-95kg", waist: "96-104 سم", hip: "106-114 سم" },
];

export default function SizeGuidePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Breadcrumb items={[{ label: "دليل القياسات" }]} className="mb-5" />
      <h1 className="text-3xl font-black text-brand-navy mb-2">دليل القياسات</h1>
      <p className="text-brand-gray mb-6 text-sm">قياساتنا بالتقريب — كل جسم مختلف. إلا كنتي محتار، ختار القياس الأكبر.</p>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-brand-navy text-white">
              <th className="px-4 py-3 text-right font-bold">القياس</th>
              <th className="px-4 py-3 text-right font-bold">الوزن (تقريبي)</th>
              <th className="px-4 py-3 text-right font-bold">الخصر</th>
              <th className="px-4 py-3 text-right font-bold">الأرداف</th>
            </tr>
          </thead>
          <tbody>
            {SIZES.map((row, i) => (
              <tr key={row.size} className={i % 2 === 0 ? "bg-white" : "bg-brand-light"}>
                <td className="px-4 py-3 font-black text-brand-gold">{row.size}</td>
                <td className="px-4 py-3 text-brand-navy">{row.weight}</td>
                <td className="px-4 py-3 text-brand-navy">{row.waist}</td>
                <td className="px-4 py-3 text-brand-navy">{row.hip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-brand-gold/10 border border-brand-gold/30 p-4">
        <p className="font-bold text-brand-navy mb-2">💡 نصيحة مهمة</p>
        <ul className="text-sm text-brand-gray space-y-1">
          <li>• إلا كنتي بين جوج قياسات، ختار دائماً القياس الأكبر</li>
          <li>• سراولنا Para ما تكبرش بعد الغسيل — فيبر ثابت</li>
          <li>• فالشك، راسلنا فواتساب ونعاونوك تختار</li>
        </ul>
      </div>
    </div>
  );
}
