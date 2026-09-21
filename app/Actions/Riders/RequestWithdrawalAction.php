<?php

namespace App\Actions\Riders;

use App\Models\RiderEarning;
use App\Models\User;
use App\Models\Withdrawal;
use Iankumu\Mpesa\Facades\Mpesa;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class RequestWithdrawalAction
{
    public function handle(User $rider, int $amount): Withdrawal
    {
        return DB::transaction(function () use ($rider, $amount) {
            $available = RiderEarning::where('rider_id', $rider->id)
                ->where('status', 'available')
                ->lockForUpdate()
                ->orderBy('created_at')
                ->get();

            if ($available->sum('amount') < $amount) {
                throw new RuntimeException('Insufficient available balance.');
            }

            $withdrawal = Withdrawal::create([
                'rider_id' => $rider->id,
                'amount'   => $amount,
                'phone'    => $rider->phone,
                'status'   => 'processing',
            ]);

            // Reserve earnings covering the amount, FIFO
            $remaining = $amount;
            foreach ($available as $earning) {
                if ($remaining <= 0) break;
                $earning->update(['status' => 'reserved', 'withdrawal_id' => $withdrawal->id]);
                $remaining -= $earning->amount;
            }

            $response = Mpesa::b2c(
                $rider->phone,          // recipient MSISDN, 2547XXXXXXXX
                $amount,
                'BusinessPayment',      // command_id
                'Delivery earnings',    // remarks
                'Rider payout'          // occasion
            );

            $data = $response->json();

            if ($response->failed() || ($data['ResponseCode'] ?? null) !== '0') {
                RiderEarning::where('withdrawal_id', $withdrawal->id)
                    ->update(['status' => 'available', 'withdrawal_id' => null]);

                $withdrawal->update([
                    'status' => 'failed',
                    'result_description' => $data['errorMessage'] ?? 'B2C request rejected',
                ]);

                Log::error('Mpesa B2C request failed', ['response' => $data]);
                throw new RuntimeException($data['errorMessage'] ?? 'Unable to initiate withdrawal');
            }

            $withdrawal->update([
                'originator_conversation_id' => $data['OriginatorConversationID'] ?? null,
                'conversation_id'            => $data['ConversationID'] ?? null,
            ]);

            return $withdrawal;
        });
    }
}