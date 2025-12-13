<?php
/**
 * Server-side rendering of the `lightbox-gallery/gallery` block.
 *
 * @package LightboxGallery
 */

/**
 * Process and sanitize gap spacing value.
 *
 * @param mixed $gap Gap value (string, array, or null).
 * @return mixed Processed gap value.
 */
function lightbox_gallery_process_gap( $gap ) {
	if ( null === $gap ) {
		return null;
	}

	$process_value = function( $value ) {
		if ( ! is_string( $value ) ) {
			return '';
		}

		// Skip if gap value contains unsupported characters.
		if ( preg_match( '%[\\\(&=}]|/\*%', $value ) ) {
			return null;
		}

		// Get spacing CSS variable from preset value if provided.
		if ( str_contains( $value, 'var:preset|spacing|' ) ) {
			$index_to_splice = strrpos( $value, '|' ) + 1;
			$slug            = _wp_to_kebab_case( substr( $value, $index_to_splice ) );
			return "var(--wp--preset--spacing--$slug)";
		}

		return $value;
	};

	if ( is_array( $gap ) ) {
		foreach ( $gap as $key => $value ) {
			$gap[ $key ] = $process_value( $value );
		}
		return $gap;
	}

	return $process_value( $gap );
}

/**
 * Render callback for the `lightbox-gallery/gallery` block.
 *
 * @param array  $attributes Attributes of the block being rendered.
 * @param string $content Content of the block being rendered.
 * @return string The content of the block being rendered.
 */
function lightbox_gallery_render( $attributes, $content ) {
	$gap = lightbox_gallery_process_gap( $attributes['style']['spacing']['blockGap'] ?? null );

	$unique_gallery_classname = wp_unique_id( 'wp-block-lightbox-gallery-gallery-' );
	$processed_content        = new WP_HTML_Tag_Processor( $content );
	$processed_content->next_tag();
	$processed_content->add_class( $unique_gallery_classname );
	$processed_content->add_class( 'wp-block-lightbox-gallery-gallery' );

	// Handle gap spacing similar to Gallery block.
	$fallback_gap = 'var( --wp--style--gallery-gap-default, var( --gallery-block--gutter-size, var( --wp--style--block-gap, 0.5em ) ) )';
	$gap_value    = $gap ?: $fallback_gap;
	$gap_column   = $gap_value;

	if ( is_array( $gap_value ) ) {
		$gap_row    = $gap_value['top'] ?? $fallback_gap;
		$gap_column = $gap_value['left'] ?? $fallback_gap;
		$gap_value  = $gap_row === $gap_column ? $gap_row : $gap_row . ' ' . $gap_column;
	}

	// The unstable gallery gap calculation requires a real value (such as `0px`) and not `0`.
	if ( '0' === $gap_column ) {
		$gap_column = '0px';
	}

	wp_style_engine_get_stylesheet_from_css_rules(
		array(
			array(
				'selector'      => ".wp-block-lightbox-gallery-gallery.{$unique_gallery_classname}",
				'declarations' => array(
					'--wp--style--unstable-gallery-gap' => $gap_column,
					'gap'                               => $gap_value,
				),
			),
		),
		array(
			'context' => 'block-supports',
		)
	);

	return $processed_content->get_updated_html();
}

