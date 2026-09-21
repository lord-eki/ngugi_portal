<?php

namespace App\Actions\Riders;

use App\Mail\RiderWelcomeMail;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class ResetRiderPasswordAction
{
    public function handle(User $rider): void
    {
        $password = Str::password(12);

        $rider->forceFill([
            'password' => $password,
            'password_encrypted' => Crypt::encryptString($password),
        ])->save();

        Mail::to($rider->email)->queue(new RiderWelcomeMail($rider, $password, resetting: true));
    }
}