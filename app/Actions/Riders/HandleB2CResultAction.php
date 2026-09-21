<?php

namespace App\Actions\Riders;

use App\Models\RiderEarning;
use App\Models\Withdrawal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HandleB2CResultAction
{
    public function handle(Request $request): void
    {
        Log::info('Mpesa B2C Result:', $request->all());

        $result = $request->input('Result');
        if (! $result) {
            return;
        }

        $conversationId = $result['ConversationID'] ?? null;
        $resultCode     = $result['ResultCode'] ?? null;

        if (! $conversationId) {
            return;
        }

        DB::transaction(function () use ($conversationId, $resultCode, $result) {
            $withdrawal = Withdrawal::where('conversation_id', $conversationId)
                ->lockForUpdate()
                ->first();

            if (! $withdrawal || $withdrawal->status !== 'processing') {
                return;
            }

            if ((int) $resultCode !== 0) {
                $withdrawal->update([
                    'status' => 'failed',
                    'result_description' => $result['ResultDesc'] ?? null,
                ]);

                RiderEarning::where('withdrawal_id', $withdrawal->id)
                    ->update(['status' => 'available', 'withdrawal_id' => null]);

                return;
            }

            $params = collect($result['ResultParameters']['ResultParameter'] ?? [])
                ->pluck('Value', 'Key');

            $withdrawal->update([
                'status'             => 'completed',
                'mpesa_receipt'      => $params->get('TransactionReceipt'),
                'result_description' => $result['ResultDesc'] ?? null,
            ]);

            RiderEarning::where('withdrawal_id', $withdrawal->id)->update(['status' => 'withdrawn']);
        });
    }

    public function handleTimeout(Request $request): void
    {
        Log::warning('Mpesa B2C Timeout:', $request->all());

        $conversationId = $request->input('Result.ConversationID')
            ?? $request->input('ConversationID');

        if (! $conversationId) {
            return;
        }

        DB::transaction(function () use ($conversationId) {
            $withdrawal = Withdrawal::where('conversation_id', $conversationId)
                ->lockForUpdate()
                ->first();

            if (! $withdrawal || $withdrawal->status !== 'processing') {
                return;
            }

            $withdrawal->update(['status' => 'failed', 'result_description' => 'Request timed out']);

            RiderEarning::where('withdrawal_id', $withdrawal->id)
                ->update(['status' => 'available', 'withdrawal_id' => null]);
        });
    }
}