<?php

namespace App\Actions\Riders;

use App\Mail\RiderWelcomeMail;
use App\Models\User;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class CreateRiderAction
{
    public function handle(array $data)
    {
        $password = Str::password(12);

        $rider = User::create([
            'name'  => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'commission_percentage' => $data['commission_percentage'] ?? null,
            'transport_type' => $data['transport_type'],
            'payout_method' => $data['payout_method'] ?? 'mpesa',
            'national_id' =>  $data['national_id'],
            'password' => $password,
            'role'  => 'rider',
        ]);

        $rider->forceFill(['password_encrypted' => Crypt::encryptString($password)])->save();
        Mail::to($rider->email)->queue(new RiderWelcomeMail($rider,$password));


        return $rider;
    }
}
