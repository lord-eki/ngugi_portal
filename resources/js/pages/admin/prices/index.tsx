import { Head, useForm } from "@inertiajs/react"
import { Edit } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";


interface Price {
    id: number;
    user_id: number;
    bottle_size: string;
    refill_price: number;
    new_price: number
}


interface Props {
    prices: Price[];
}


export default function SetPrices({ prices }: Props) {

    const { data, setData, post, processing, errors, reset } = useForm({
        bottle_size: "",
        refill_price: "",
        new_price: ""
    });

    const submit = (e: React.SubmitEvent) => {
        e.preventDefault();
        post("/admin/prices", { onSuccess: () => reset() })
    }


    return (
        <>
            <Head title="Set Prices" />

            <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
                <h1 className="text-xl font-bold text-[#0D2A47]">Set Prices </h1>

                <form onSubmit={submit} className="space-y-3 rounded-2xl border border-[#D4E8F5] bg-white p-5">
                    <p className="text-sm">Add Pricing to the bottle sizes</p>

                    <div className="grid gap-3 md:grid-cols-3">
                        <div>
                            <label className="text-sm text-gray-400 py-4">Select the bottle size</label>
                            <select value={data.bottle_size} onChange={(e) => setData("bottle_size", e.target.value)} name="bottle_size" required className="w-full rounded-lg border border-[#D4E8F5] bg-white px-3 py-2 text-sm">
                                <option value=""> --Select-- </option>
                                <option value="500ML">500ML Bottle</option>
                                <option value="1L">1L Bottle</option>
                                <option value="5L">5L Bottle</option>
                                <option value="10L">10L Bottle</option>
                                <option value="15L">15L Bottle</option>
                                <option value="20L">20L Bottle</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-gray-400 py-4">Refill price</label>
                            <input value={data.refill_price} onChange={(e) => setData("refill_price", e.target.value)} name="refill_price" type="number" className="w-full rounded-lg border border-[#D4E8F5] px-3 py-2 text-sm" placeholder="Enter the refill price" required />
                            {errors.refill_price && (<p className="mt-1 text-xs text-red-600">{errors.refill_price}</p>)}
                        </div>
                        <div>
                            <label className="text-sm text-gray-400 py-4">Price for a new bottle</label>
                            <input value={data.new_price} onChange={(e) => setData("new_price", e.target.value)} name="new_price" type="number" className="w-full rounded-lg border border-[#D4E8F5] px-3 py-2  text-sm" placeholder="Enter the new price" required />
                            {errors.new_price && (<p className="mt-1 text-xs text-red-600">{errors.new_price}</p>)}
                        </div>
                        <button type="submit" className="cursor-pointer rounded-lg bg-[#1A4A7A] mt-4 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={processing}>
                            Set Price
                        </button>
                    </div>
                </form>

            </div>


            <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
                <table className="w-full text-sm rounded-lg border border-[#D4E8F5] ">
                    <thead className="bg-[#F58FC] text-xs text-[#8AA8C0]">
                        <tr>
                            <th className="px-20 py-2.5 text-left font-semibold">#ID</th>
                            <th className="px-20 py-2.5 text-left font-semibold">Bottle Size</th>
                            <th className="px-20 py-2.5 text-left font-semibold">Refill Price</th>
                            <th className="px-20 py-2.5 text-left font-semibold">New Price</th>
                            <th className="px-20 py-2.5 text-left font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {prices.map((p) => <PriceRow key={p.id} price={p} />)}
                        {prices.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-4 py-6 text-center text-[#8AA8C0]">You're yet to set the prices </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );


    function PriceRow({ price }: { price: Price }) {
        const [editing, setEditing] = useState(false);
        const { data, setData, patch, processing, errors, reset, clearErrors } = useForm({
            refill_price: String(price.refill_price),
            new_price: String(price.new_price)
        });

        const save = () => patch(`/admin/prices/${price.id}`, {
            preserveScroll: true,
            onSuccess: () => setEditing(false),
            onError: (errs) => toast.error(Object.values(errs)[0] as string)
        });

        const cancel = () => {
            reset();
            clearErrors();
            setEditing(false);
        }

        return (
            <tr className="border-t border-[#D4E8F5 text-center text-xs">
                <td className="px-4 py-2.5">{price.id}</td>
                <td className="px-4 py-2.5">{price.bottle_size}</td>
                <td className="px-4 py-2.5">
                    {editing
                        ? <input type="number" value={data.refill_price} onChange={(e) => setData("refill_price", e.target.value)} className="w-24 rounded border px-2 py-1" />
                        : `KSH ${price.refill_price}`}
                </td>
                <td className="px-4 py-2.5">
                    {editing
                        ? <input type="number" value={data.new_price} onChange={(e) => setData("new_price", e.target.value)} className="w-24 rounded border px-2 py-1" />
                        : `KSH ${price.new_price}`}
                </td>
                <td className="px-4 py-2.5">
                    {editing ? (
                        <>
                            <button onClick={save} disabled={processing} className="mr-2 font-semibold text-[#1A4A7A]">Save</button>
                            <button onClick={cancel}>Cancel</button>
                        </>
                    ) : (
                        <button onClick={() => setEditing(true)}><Edit className="mx-auto h-4 w-4" /></button>
                    )}
                </td>

            </tr>
        );
    }


}