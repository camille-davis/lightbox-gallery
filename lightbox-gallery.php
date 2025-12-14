<?php
/**
 * Plugin Name: Lightbox Gallery
 * Plugin URI: https://github.com/camilledavis/lightbox-gallery
 * Description: A simple Gallery block with a lightbox and left-right navigation.
 * Version: 1.0.0
 * Author: Camille Davis
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
	wp_enqueue_script(
		'lightbox-gallery-gallery-editor',
		plugin_dir_url( __FILE__ ) . 'index.js',
		array( 'wp-blocks', 'wp-block-editor', 'wp-components', 'wp-element', 'wp-i18n', 'wp-data' ),
		'1.0.0',
		true
	);
}
add_action( 'enqueue_block_editor_assets', 'lightbox_gallery_enqueue_editor_assets' );

/**
 * In dev, remove version from lightbox gallery script.
 *
 * @param string $src The source URL.
 */
function lightbox_gallery_remove_version_script( $src ) {
	if ( defined( 'WP_DEBUG' ) && WP_DEBUG && strpos( $src, 'lightbox-gallery/index.js' ) !== false && strpos( $src, 'ver=' ) ) {
		$src = remove_query_arg( 'ver', $src );
	}
	return $src;
}
add_filter( 'script_loader_src', 'lightbox_gallery_remove_version_script', 9999 );

/**
 * Registers the block using config from `block.json`.
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
