<?php

use App\Models\Refiller;
use App\Models\Order;
use App\Models\User;

it('assigns a refiller to an order', function(){
    $admin =  User::factory()->admin()->create();
    $order =  Order::factory()->create();
    $refiller =  Refiller::factory()->create();

    $this->actingAs($admin)
    ->post("/admin/orders/{$order->id}/assign-refiller" , ['refiller_id' => $refiller->id])
    ->assertRedirect();

    expect($order->fresh()->refiller_id)->toBe($refiller->id);
});
