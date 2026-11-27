<?php

return [
    'environment' => env('MPESA_ENVIRONMENT', 'production'),
    'mpesa_consumer_key' => env('MPESA_CONSUMER_KEY'),
    'mpesa_consumer_secret' => env('MPESA_CONSUMER_SECRET'),
    'passkey' => env('MPESA_PASSKEY', 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'),
    'shortcode' => env('MPESA_SHORTCODE', '174379'),

    'callbacks' => [
        'mpesa_stk_callback_url' => env('MPESA_CALLBACK_URL'),
    ],

];
