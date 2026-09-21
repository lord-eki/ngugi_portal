@component('mail::message')
# {{ $resetting ? 'Your password has been reset' : "Welcome aboard, {$rider->name}! 🏍️" }}

@if(! $resetting)
You've been added as a rider on our delivery platform. Here's everything you need to get started.
@else
Here are your new login details.
@endif

**Email:** {{ $rider->email }}
**Temporary password:** {{ $password }}

@component('mail::button', ['url' => $loginUrl])
Log in to your dashboard
@endcomponent

Once you're in, you'll see the orders assigned to you, update delivery status as you go, and track your earnings — including withdrawing straight to your phone.

For your security, please change this password after your first login.

Thanks,<br>
{{ config('app.name') }}
@endcomponent