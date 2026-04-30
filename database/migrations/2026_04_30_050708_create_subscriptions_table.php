<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('phone');           
            $table->string('email')->nullable();
            $table->string('address')->nullable();
            $table->enum('frequency', ['daily', 'weekly', 'biweekly', 'monthly']);
            $table->json('days')->nullable(); 
            $table->string('time_slot');         
            $table->json('sizes');              
            $table->unsignedInteger('total_per_cycle')->default(0);  
            $table->enum('payment_method', ['mpesa-stk', 'card']);
            $table->enum('status', ['pending', 'active', 'paused', 'cancelled'])->default('pending');
            $table->text('admin_notes')->nullable();
            $table->timestamp('next_delivery_at')->nullable();
            $table->timestamp('last_delivery_at')->nullable();
            $table->timestamps();
        });
    }

   
};