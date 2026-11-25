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
        Schema::table('prices', function (Blueprint $table) {
            $table->boolean('has_bundle')->default(false)->after('new_price');
            $table->json('bundle_options')->nullable()->after('has_bundle');
            $table->boolean('is_active')->default(true)->after('bundle_options');
            $table->unsignedBigInteger('sort_order')->default(0)->after('is_active');
        });
    }

 
};
