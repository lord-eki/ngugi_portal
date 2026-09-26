<?php

use App\Models\{User,RiderEarning};
use Illuminate\Support\Facades\Http;

it('rejects a withdrawal larger than the available balance', function () {
    $rider = User::factory()->rider()->active()->online()->create();
    RiderEarning::factory()->create(['rider_id' => $rider->id, 'amount' => 100, 'status' => 'available']);

    $this->actingAs($rider)
        ->post('/rider/withdrawals', ['amount' => 500])
        ->assertSessionHasErrors('amount');
});

it('reserves earnings and calls B2C on a valid withdrawal request', function () {
    Http::fake(['api.safaricom.co.ke/*' => Http::response([
        'ResponseCode' => '0',
        'ConversationID' => 'conv-123',
        'OriginatorConversationID' => 'orig-123',
    ])]);

    $rider = User::factory()->rider()->active()->online()->create();
    $earning = RiderEarning::factory()->create(['rider_id' => $rider->id, 'amount' => 500, 'status' => 'available']);

    $this->actingAs($rider)
        ->post('/rider/withdrawals', ['amount' => 500])
        ->assertRedirect();

    expect($earning->fresh()->status)->toBe('reserved');
    $this->assertDatabaseHas('withdrawals', ['rider_id' => $rider->id, 'amount' => 500, 'status' => 'processing']);
});

it('reverts reserved earnings back to available when B2C fails', function () {
    Http::fake(['api.safaricom.co.ke/*' => Http::response(['ResponseCode' => '1', 'errorMessage' => 'Insufficient funds'], 200)]);

    $rider = User::factory()->rider()->active()->online()->create();
    $earning = RiderEarning::factory()->create(['rider_id' => $rider->id, 'amount' => 500, 'status' => 'available']);

    $this->actingAs($rider)->post('/rider/withdrawals', ['amount' => 500]);

    expect($earning->fresh()->status)->toBe('available'); 
});
