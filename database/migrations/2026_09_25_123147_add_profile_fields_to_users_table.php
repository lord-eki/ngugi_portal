<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('national_id')->nullable()->after('phone');
            $table->string('payout_method')->default('mpesa')->after('national_id');
            $table->string('transport_type')->nullable()->after('payout_method');
        });
    }

 
};
