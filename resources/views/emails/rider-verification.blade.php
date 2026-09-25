@component('mail::message')
# Verify your email, {{ $rider->name }}

One last step - confirm this is really your email address to fully ativate your rider account.

@component('mail::button',['url' => $verifyUrl])
Verify Email
@endcomponent
This link expires in 7 days. Until you verify , you won't be assignable to new deliveries.

Thanks, <br>
{{ config('app.name') }}
@endcomponent