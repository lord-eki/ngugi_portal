<?php

namespace App\Http\Requests;

use App\Support\Phone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreCheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $raw = $this->input('phone');
        $this->merge(['phone' => Phone::normalize($raw) ?? $raw]);
    }

    public function rules(): array
    {
        return [
            'idempotency_key' => ['required', 'string', 'max:64'],
            'phone'           => ['required', 'regex:/^254[17]\d{8}$/'],

            'order'                            => ['required', 'array'],
            'order.deliverySpeed'              => ['required', 'in:standard,instant'],
            'order.newSizes'                   => ['nullable', 'array'],
            'order.newSizes.*.qty'             => ['nullable', 'integer', 'min:1', 'max:100'],
            'order.newSizes.*.isBundle'        => ['nullable', 'boolean'],
            'order.newSizes.*.bundleQty'       => ['nullable', 'integer', 'min:1', 'max:50'],
            'order.newSizes.*.bundleSize'      => ['nullable', 'integer', 'min:1'],
            'order.refillSizes'                => ['nullable', 'array'],
            'order.refillSizes.*.qty'          => ['nullable', 'integer', 'min:1', 'max:100'],

            'delivery'                  => ['required', 'array'],
            'delivery.locationMode'     => ['required', 'in:pin,manual,someone-else'],
            'delivery.pinAddress'       => ['nullable', 'string', 'max:255'],
            'delivery.manualAddress'    => ['nullable', 'string', 'max:255'],
            'delivery.pinLocation.lat'  => ['nullable', 'numeric', 'between:-90,90'],
            'delivery.pinLocation.lng'  => ['nullable', 'numeric', 'between:-180,180'],
            'delivery.contactName'      => ['nullable', 'string', 'max:100'],
            'delivery.contactPhone'     => ['nullable', 'string', 'max:20'],
            'delivery.contactEmail'     => ['nullable', 'email', 'max:150'],
            'delivery.recipientName'    => ['nullable', 'string', 'max:100'],
            'delivery.recipientPhone'   => ['nullable', 'string', 'max:20'],
            'delivery.recipientEmail'   => ['nullable', 'email', 'max:150'],
            'delivery.scheduleType'     => ['required', 'in:asap,later,next-day'],
            'delivery.scheduledTime'    => ['nullable', 'string', 'max:50'],
            'delivery.notes'            => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return ['phone.regex' => 'Enter a valid Safaricom number, e.g. 0712 345 678.'];
    }

    public function after(): array
    {
        return [
            function (Validator $v) {
                $d = $this->input('delivery', []);

                if (blank($d['pinAddress'] ?? null) && blank($d['manualAddress'] ?? null)) {
                    $v->errors()->add('delivery.manualAddress', 'Please provide a delivery address.');
                }

                if (empty($this->input('order.newSizes')) && empty($this->input('order.refillSizes'))) {
                    $v->errors()->add('order', 'Your order has no items.');
                }
            },
        ];
    }
}