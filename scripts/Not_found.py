"""
not-found-images.py

Products in the seed data for which NO clean, product-only image
(no text / banner / ads / promo, plain background) could be sourced.

These entries were left with their original image_url in the brand JSON
files. Review them manually and supply an image URL when available,
then re-run the seeder for that brand.

Generated as part of the product-image sourcing pass.
Total: 8 products.
"""

NOT_FOUND_PRODUCTS = [
    {
        'brand': 'eSSL',
        'model_name': 'eSSL9500',
        'product_name': 'eSSL9500',
        'category': 'Biometric & Identity',
        'sub_category': 'Fingerprint Recognition',
        'source_file': 'eSSL.json',
        'json_index': 15,
        'reason': 'eSSL9500 - no clean product-only image found (results were other models)',
    },
    {
        'brand': 'eSSL',
        'model_name': 'SILKBIO101TC',
        'product_name': 'SILKBIO101TC',
        'category': 'Biometric & Identity',
        'sub_category': 'Face Recognition',
        'source_file': 'eSSL.json',
        'json_index': 41,
        'reason': 'SilkBio-101TC - only presentation slides found, no clean product-only image',
    },
    {
        'brand': 'eSSL',
        'model_name': 'BB-Radar',
        'product_name': 'BB-Radar',
        'category': 'Access Control',
        'sub_category': 'Boom Barrier',
        'source_file': 'eSSL.json',
        'json_index': 46,
        'reason': 'BB-Radar: boom-barrier radar sensor - no clean product-only image found',
    },
    {
        'brand': 'eSSL',
        'model_name': 'BG-S-105 (2M)',
        'product_name': 'BG-S-105 (2M)',
        'category': 'Access Control',
        'sub_category': 'Boom Barrier',
        'source_file': 'eSSL.json',
        'json_index': 53,
        'reason': 'BG-S-105: no clean product-only image found',
    },
    {
        'brand': 'eSSL',
        'model_name': 'BG-SC-300',
        'product_name': 'BG-SC-300',
        'category': 'Access Control',
        'sub_category': 'Boom Barrier',
        'source_file': 'eSSL.json',
        'json_index': 54,
        'reason': 'BG-SC-300: barrier controller - no clean product-only image found',
    },
    {
        'brand': 'eSSL',
        'model_name': 'BG-CM-300',
        'product_name': 'BG-CM-300',
        'category': 'Access Control',
        'sub_category': 'Boom Barrier',
        'source_file': 'eSSL.json',
        'json_index': 56,
        'reason': 'BG-CM-300: barrier controller - no clean product-only image found',
    },
    {
        'brand': 'eSSL',
        'model_name': 'SB-SPL-310',
        'product_name': 'SB-SPL-310',
        'category': 'Access Control',
        'sub_category': 'Boom Barrier',
        'source_file': 'eSSL.json',
        'json_index': 92,
        'reason': 'SB-SPL-310: no clean product-only image found',
    },
    {
        'brand': 'eSSL',
        'model_name': 'SmartLife - Smart Living App',
        'product_name': 'SmartLife - Smart Living App',
        'category': 'Access Control',
        'sub_category': 'Mobile App Device',
        'source_file': 'eSSL.json',
        'json_index': 232,
        'reason': 'SmartLife App: software application, not a physical product',
    },
]


def main() -> None:
    print(f"Products with no clean product-only image found: {len(NOT_FOUND_PRODUCTS)}")
    for i, p in enumerate(NOT_FOUND_PRODUCTS, 1):
        print(f"{i:2}. [{p['brand']}] {p['model_name']} - {p['product_name']}")
        print(f"     file={p['source_file']} index={p['json_index']}")
        print(f"     reason: {p['reason']}")


if __name__ == "__main__":
    main()