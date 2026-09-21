@component('mail::message')
# Your delivery is on the way! 

Order #{{ $order->id }} is out for delivery.

## {{ $code }}

Give this code to the rider when your order arrives — it confirms the delivery to you.

If you didn't place this order, you can ignore this email.

Thanks,<br>
{{ config('app.name') }}
@endcomponent