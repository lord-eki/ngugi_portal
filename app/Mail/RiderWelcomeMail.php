<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class RiderWelcomeMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $rider,
        public string $password,
        public bool $resetting = false,
    ) {}

    public function build(): self
    {
        return $this
            ->subject($this->resetting ? 'Your new password' : 'Welcome to the rider team!')
            ->markdown('emails.rider-welcome', [
                'rider'     => $this->rider,
                'password'  => $this->password,
                'resetting' => $this->resetting,
                'loginUrl'  => route('login'),
            ]);
    }
}