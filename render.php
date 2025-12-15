<?php
/**
 * Render `lightbox-gallery/gallery` block for display.
 *
 * @package LightboxGallery
 */

/**
 * Render callback for the `lightbox-gallery/gallery` block.
 *
 * @param array $attributes Attributes of the block being rendered.
 * @param string $content Content of the block being rendered.
 * @return string The content of the block being rendered.
 */
function lightbox_gallery_render( $attributes, $content ) {
	$unique_gallery_classname = wp_unique_id( 'wp-block-lightbox-gallery-gallery-' );
	$processed_content = new WP_HTML_Tag_Processor( $content );
	$processed_content->next_tag();
	$processed_content->add_class( $unique_gallery_classname );
	return $processed_content->get_updated_html();
}
