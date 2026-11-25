<?php

namespace App\Services;

use App\Models\Price;

class PricingService
{
    public function quote(array $order): array
    {
        $prices = Price::where('is_active',true)->get()->keyBy('bottle_size');
        $items = [];
        $sub = 0;

        foreach(['new' => $order['newSizes'] ?? [], 'refill' => $order['refillSizes'] ?? []] as $type => $sizes){
            foreach($sizes as $size => $entry){
                $price = $prices->get($size);
                abort_if(!$price,422,"Size {$size} is not available.");

                $unit = (int) ($type === 'refill' ? $price->refill_price : $price->new_price);
                $qty = min(max((int) ($entry['qty'] ?? 0),1),100);
                $isBundle = $type === 'new' && $price->has_bundle && !empty($entry['isBundle']);

                if($isBundle){
                    $pack = (int) ($entry['bundleSize'] ?? 0);
                    abort_unless(in_array($pack,$price->bundle_options ?? [], true),422, 'Invalid bundle size');
                    $bundleQty = min(max((int) ($entry['bundleQty'] ?? 1),1),50);
                    $amount = $pack * $bundleQty * $unit;

                } else {
                    $pack = $bundleQty = null;
                    $amount = $qty * $unit;
                }

                $items[] = compact('type','size','qty','isBundle','pack','bundleQty','unit','amount');
                $sub += $amount;
            }
        }

        $charges = [['label' => 'Delivery fee','amount' => config('pricing.delivery_fee')]];
        
        if(($order['deliverySpeed'] ?? 'standard') === 'instant'){
            $charges[] = ['label' => 'Instant delivery fee','amount' => config('pricing.instant_fee')];
        }

        return ['items' => $items, 'charges' => $charges , 'grand_total' => $sub + array_sum(array_column($charges,'amount'))];
    }
}