<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreSubscriptionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name'             => ['required', 'string', 'max:100'],
            'phone'            => ['required', 'string', 'min:9', 'max:12'],
            'email'            => ['nullable', 'email', 'max:150'],
            'address'          => ['nullable', 'string', 'max:255'],
            'frequency'        => ['required', 'in:daily,weekly,biweekly,monthly'],
            'days'             => ['nullable', 'array'],
            'days.*'           => ['string', 'in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday'],
            'time_slot'        => ['required', 'string'],
            'sizes'            => ['required', 'array', 'min:1'],
            'sizes.*.size'     => ['required', 'string'],
            'sizes.*.quantity' => ['required', 'integer', 'min:1'],
            'sizes.*.type'     => ['required', 'in:refill,new'],
            'payment_method'   => ['required', 'in:mpesa-stk,card'],
        ];
    }
}
