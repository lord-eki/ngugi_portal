<?php
namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class DeliveryCodeMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Order $order, public string $code) {}

    public function build(): self
    {
        return $this
            ->subject("Your delivery code: {$this->code}")
            ->markdown('emails.delivery-code', ['code' => $this->code, 'order' => $this->order]);
    }
}