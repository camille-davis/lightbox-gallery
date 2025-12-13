<?php
/**
 * Plugin Name: Lightbox Gallery
 * Plugin URI: https://github.com/yourusername/lightbox-gallery
 * Description: A simplified Gallery block for WordPress with lightbox functionality (coming soon).
 * Version: 1.0.0
 * Author: Your Name
 * License: GPL-2.0-or-later
 * Text Domain: lightbox-gallery
 *
 * @package LightboxGallery
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Load the render callback.
require_once __DIR__ . '/render.php';

/**
 * Enqueue block editor assets.
 */
function lightbox_gallery_enqueue_editor_assets() {
	$script_path = plugin_dir_path( __FILE__ ) . 'index.js';
	$script_url  = plugin_dir_url( __FILE__ ) . 'index.js';

	wp_enqueue_script(
		'lightbox-gallery-gallery-editor',
		$script_url,
		array(
			'wp-blocks',
			'wp-block-editor',
			'wp-components',
			'wp-element',
			'wp-i18n',
			'wp-data',
		),
		file_exists( $script_path ) ? filemtime( $script_path ) : '1.0.0',
		true
	);
}
add_action( 'enqueue_block_editor_assets', 'lightbox_gallery_enqueue_editor_assets' );

/**
 * Registers the block using the metadata loaded from the `block.json` file.
 * Behind the scenes, it registers also all assets so they can be enqueued
 * through the block editor in the corresponding context.
 */
function lightbox_gallery_register_block() {
	register_block_type(
		__DIR__,
		array(
			'render_callback' => 'lightbox_gallery_render',
		)
	);
}
add_action( 'init', 'lightbox_gallery_register_block' );

