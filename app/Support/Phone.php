<?php

namespace App\Support;

final class Phone
{
    public static function normalize(?string $raw): ?string
    {
        $d = preg_replace('/\D/', '', (string) $raw);

        if (str_starts_with($d, '0')) {
            $d = '254' . substr($d, 1);
        } elseif (preg_match('/^[17]\d{8}$/', $d)) {
            $d = '254' . $d;
        }

        return preg_match('/^254[17]\d{8}$/', $d) ? $d : null;
    }
}