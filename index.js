(function () {

	// Import block registration functionality.
	const { registerBlockType } = wp.blocks;

	// Import WP and block editor components and hooks.
	const { useBlockProps, InnerBlocks, MediaUpload, MediaUploadCheck, BlockControls, useInnerBlocksProps } = wp.blockEditor;
	const { Button, Placeholder, ToolbarButton } = wp.components;

	// Import React utilities.
	const { createElement, Fragment } = wp.element;

	// Import translation function.
	const { __ } = wp.i18n;

	// Import WP data store functions and hooks.
	const { useSelect, useDispatch, subscribe, select } = wp.data;

	// Import WP SVG components.
	const { SVG, Path } = wp.primitives;

	// Use gallery icon from WP icons library.
	const galleryIcon = createElement(SVG, {
		viewBox: '0 0 24 24',
		xmlns: 'http://www.w3.org/2000/svg',
	}, createElement(Path, {
		d: 'M16.375 4.5H4.625a.125.125 0 0 0-.125.125v8.254l2.859-1.54a.75.75 0 0 1 .68-.016l2.384 1.142 2.89-2.074a.75.75 0 0 1 .874 0l2.313 1.66V4.625a.125.125 0 0 0-.125-.125Zm.125 9.398-2.75-1.975-2.813 2.02a.75.75 0 0 1-.76.067l-2.444-1.17L4.5 14.583v1.792c0 .069.056.125.125.125h11.75a.125.125 0 0 0 .125-.125v-2.477ZM4.625 3C3.728 3 3 3.728 3 4.625v11.75C3 17.273 3.728 18 4.625 18h11.75c.898 0 1.625-.727 1.625-1.625V4.625C18 3.728 17.273 3 16.375 3H4.625ZM20 8v11c0 .69-.31 1-.999 1H6v1.5h13.001c1.52 0 2.499-.982 2.499-2.5V8H20Z',
		fillRule: 'evenodd',
	}));

	// Register the Lightbox Gallery block type.
	registerBlockType('lightbox-gallery/gallery', {
		icon: galleryIcon,

		// Edit - runs when block is rendered in editor and received props from WP.
		edit: function Edit(props) {
			const { clientId } = props;
			const { replaceInnerBlocks } = useDispatch('core/block-editor');

			// Replaces gallery contents with images from media library.
			const replaceImages = function (images) {
				if (!images || images.length === 0) {
					return;
				}

				// Convert images to blocks.
				const imageBlocksToInsert = images.map(function (image) {
					return wp.blocks.createBlock('core/image', {
						id: image.id,
						url: image.url,
						alt: image.alt || ''
					});
				});

				// Insert images.
				replaceInnerBlocks(clientId, imageBlocksToInsert, false);
			};

			// Get block props.
			const blockProps = useBlockProps();
			const innerBlocksProps = useInnerBlocksProps(blockProps);

			// Get existing image blocks.
			const imageBlocks = useSelect(function (select) {
				return select('core/block-editor').getBlocks(clientId);
			}, [clientId]);
			const hasImages = imageBlocks && imageBlocks.length > 0;

			// If gallery has no images, show a placeholder with "Choose Images" button.
			if (!hasImages) {
				return createElement(
					'div',
					innerBlocksProps,
					createElement(
						Placeholder,
						{
							icon: galleryIcon,
							label: __('Lightbox Gallery')
						},
						createElement(
							MediaUploadCheck,
							null,
							createElement(
								MediaUpload,
								{
									onSelect: replaceImages,
									allowedTypes: ['image'],
									multiple: true,
									gallery: true,
									value: [],
									render: function (obj) {
										return createElement(Button, {
											variant: 'primary',
											onClick: obj.open,
										}, __('Open Media Library'));
									},
								}
							)
						)
					)
				);
			}

			// Render gallery with images.
			return createElement(
				Fragment,
				null,
				createElement(
					BlockControls,
					{
						group: 'other',
					},
					createElement(
						MediaUploadCheck,
						null,
						createElement(
							MediaUpload,
							{
								onSelect: replaceImages,
								allowedTypes: ['image'],
								multiple: true,
								gallery: true,
								addToGallery: true,
								value: imageBlocks.map(function (block) {
									return block.attributes.id;
								}).filter(Boolean),
								render: function (obj) {
									return createElement(ToolbarButton, {
										onClick: obj.open,
									}, __('Update Images'));
								},
							}
						)
					)
				),
				createElement('figure', innerBlocksProps,
					createElement(InnerBlocks, null)
				)
			);
		},

		// Save - runs when WP saves the page.
		save: function Save() {
			const blockProps = useBlockProps.save();
			return createElement(
				'figure',
				blockProps,
				createElement(InnerBlocks.Content, null)
			);
		},
	});

		// Track the previously selected block.
		let previousSelectedBlockClientId = null;

		// Function to hide the duotone toolbar button
		function hideDuotoneToolbarGroup() {
			// Find the duotone button in the block toolbar
			// Uses aria-label to find it (WordPress adds this for accessibility)
			const duotoneButton = document.querySelector('.block-editor-block-toolbar button[aria-label="Apply duotone filter"]');

			if (duotoneButton) {
				// Find the parent toolbar group that contains this button
				// closest() traverses up the DOM tree to find matching ancestor
				const toolbarGroup = duotoneButton.closest('.components-toolbar-group');
				if (toolbarGroup) {
					// Hide the entire toolbar group (not just the button)
					toolbarGroup.style.display = 'none';
				}
			}
		}

		// Subscribe to WordPress block editor store changes
		// This callback runs whenever the store state changes (e.g., block selection)
		subscribe(function () {
			// Get the block editor store
			const blockEditor = select('core/block-editor');

			// Get the currently selected block (null if nothing selected)
			const selectedBlock = blockEditor.getSelectedBlock();

			// Skip if no block selected or same block as before (avoid unnecessary work)
			if (!selectedBlock || selectedBlock.clientId === previousSelectedBlockClientId) {
				// If nothing selected, reset the tracking variable
				if (!selectedBlock) {
					previousSelectedBlockClientId = null;
				}
				return; // Exit early
			}

			// Update tracking variable to current selection
			previousSelectedBlockClientId = selectedBlock.clientId;

			// Only hide duotone if the selected block is an image block
			if (selectedBlock.name === 'core/image') {
				// Get all parent block IDs (walking up the block tree)
				// true = include all ancestors, not just immediate parent
				const parentIds = blockEditor.getBlockParents(selectedBlock.clientId, true);

				// Check if any parent is a lightbox gallery block
				const isInLightboxGallery = parentIds.some(function (parentId) {
					// Get the parent block object
					const parentBlock = blockEditor.getBlock(parentId);
					// Check if parent is our lightbox gallery block
					return parentBlock && parentBlock.name === 'lightbox-gallery/gallery';
				});

				// If image is inside a lightbox gallery, hide the duotone button
				if (isInLightboxGallery) {
					// Hide immediately
					hideDuotoneToolbarGroup();
					// Also hide on next frame (WordPress might re-render toolbar)
					// requestAnimationFrame runs after browser repaint
					requestAnimationFrame(hideDuotoneToolbarGroup);
				}
			}
		});
})();

