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
        Schema::table('payments', function (Blueprint $table) {
            $table->string('status')->default('pending')->after('method');
            $table->string('checkout_request_id')->nullable()->index()->after('status');
            $table->string('merchant_request_id')->nullable()->after('checkout_request_id');
            $table->string('mpesa_receipt_number')->nullable()->after('merchant_request_id');
            $table->integer('result_code')->nullable()->after('mpesa_receipt_number');
            $table->text('result_description')->nullable()->after('result_code');
        });
    }
};
