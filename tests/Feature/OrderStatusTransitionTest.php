<?php

use App\Models\Delivery;
use App\Models\Order;
use App\Models\User;

it('blocks admin from marking out for delivery with no rider assigned', function(){
    $admin = User::factory()->admin()->create();
    $order =  Order::factory()->create(['status' => 'confirmed']);
    Delivery::factory()->create(['order_id' => $order->id , 'rider_id' => null]);

    $this->actingAs($admin)
    ->post("/orders/{$order->id}/status" , ['status' => 'out_for_delivery'])
    ->assertStatus(422);

    expect($order->fresh()->status)->toBe('confirmed');
});

it('allows admin to dispatch once a rider is assigned ' , function(){
     $admin = User::factory()->admin()->create();
    $rider = User::factory()->rider()->active()->online()->create();
    $order = Order::factory()->create(['status' => 'confirmed']);
    Delivery::factory()->create(['order_id' => $order->id, 'rider_id' => $rider->id]);

    $this->actingAs($admin)
        ->post("/orders/{$order->id}/status", ['status' => 'out_for_delivery'])
        ->assertRedirect();

    expect($order->fresh()->status)->toBe('out_for_delivery');
});


it('rejects a rider marking  delivered with the wrong code', function(){
    $rider = User::factory()->rider()->active()->online()->create();
    $order = Order::factory()->create(['status' => 'out_for_delivery']);
    Delivery::factory()->create(['order_id' => $order->id, 'rider_id' => $rider->id, 'delivery_code' => '4821']);

     $this->actingAs($rider)
        ->post("/orders/{$order->id}/status", ['status' => 'delivered', 'delivery_code' => '0000'])
        ->assertStatus(422);

    expect($order->fresh()->status)->toBe('out_for_delivery');
});

it('confirms delivery with the correct code and records a rider earning', function () {
    $rider = User::factory()->rider()->active()->online()->create(['commission_percentage' => 10]);
    $order = Order::factory()->create(['status' => 'out_for_delivery', 'grand_total' => 1000]);
    Delivery::factory()->create(['order_id' => $order->id, 'rider_id' => $rider->id, 'delivery_code' => '4821']);

    $this->actingAs($rider)
        ->post("/orders/{$order->id}/status", ['status' => 'delivered', 'delivery_code' => '4821'])
        ->assertRedirect();

    expect($order->fresh()->status)->toBe('delivered');
    $this->assertDatabaseHas('rider_earnings', [
        'order_id' => $order->id,
        'rider_id' => $rider->id,
        'amount' => 100,
    ]);
});

it('lets admin mark delivered without the code, as the escalation path', function () {
    $admin = User::factory()->admin()->create();
    $rider = User::factory()->rider()->active()->online()->create();
    $order = Order::factory()->create(['status' => 'out_for_delivery']);
    Delivery::factory()->create(['order_id' => $order->id, 'rider_id' => $rider->id, 'delivery_code' => '4821']);

    $this->actingAs($admin)
        ->post("/orders/{$order->id}/status", ['status' => 'delivered'])
        ->assertRedirect();

    expect($order->fresh()->status)->toBe('delivered');
    $this->assertDatabaseHas('rider_earnings', ['order_id' => $order->id]);
});

it('blocks a rider from updating an order not assigned to them', function () {
    $rider = User::factory()->rider()->active()->online()->create();
    $otherRider = User::factory()->rider()->active()->online()->create();
    $order = Order::factory()->create(['status' => 'out_for_delivery']);
    Delivery::factory()->create(['order_id' => $order->id, 'rider_id' => $otherRider->id]);

    $this->actingAs($rider)
        ->post("/orders/{$order->id}/status", ['status' => 'delivered', 'delivery_code' => 'anything'])
        ->assertStatus(403);
});

it('blocks a suspended rider even with a still-valid session', function () {
    $rider = User::factory()->rider()->suspended()->online()->create();
    $order = Order::factory()->create(['status' => 'out_for_delivery']);
    Delivery::factory()->create(['order_id' => $order->id, 'rider_id' => $rider->id]);

    $this->actingAs($rider)
        ->post("/orders/{$order->id}/status", ['status' => 'delivered', 'delivery_code' => 'x'])
        ->assertStatus(403);
});