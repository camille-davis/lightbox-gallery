(function () {
	const { registerBlockType } = wp.blocks;
	const { useBlockProps, InnerBlocks, MediaUpload, MediaUploadCheck, BlockControls, useInnerBlocksProps } = wp.blockEditor;
	const { Button, Placeholder, ToolbarButton } = wp.components;
	const { createElement, Fragment, useEffect } = wp.element;
	const { __ } = wp.i18n;
	const { useSelect, useDispatch } = wp.data;
	const { SVG, Path } = wp.primitives;

	// -------------------------------------
	// Lightbox Gallery block functionality.
	// -------------------------------------

	// Gallery icon from WP icons library.
	const galleryIcon = createElement(SVG, {
		viewBox: '0 0 24 24',
		xmlns: 'http://www.w3.org/2000/svg',
	}, createElement(Path, {
		d: 'M16.375 4.5H4.625a.125.125 0 0 0-.125.125v8.254l2.859-1.54a.75.75 0 0 1 .68-.016l2.384 1.142 2.89-2.074a.75.75 0 0 1 .874 0l2.313 1.66V4.625a.125.125 0 0 0-.125-.125Zm.125 9.398-2.75-1.975-2.813 2.02a.75.75 0 0 1-.76.067l-2.444-1.17L4.5 14.583v1.792c0 .069.056.125.125.125h11.75a.125.125 0 0 0 .125-.125v-2.477ZM4.625 3C3.728 3 3 3.728 3 4.625v11.75C3 17.273 3.728 18 4.625 18h11.75c.898 0 1.625-.727 1.625-1.625V4.625C18 3.728 17.273 3 16.375 3H4.625ZM20 8v11c0 .69-.31 1-.999 1H6v1.5h13.001c1.52 0 2.499-.982 2.499-2.5V8H20Z',
		fillRule: 'evenodd',
	}));

	registerBlockType('lightbox-gallery/gallery', {
		icon: galleryIcon,

		// Adds block functionality when block is rendered in editor.
		edit: function Edit(props) {
			const { clientId, attributes, setAttributes } = props;
			const { replaceInnerBlocks } = useDispatch('core/block-editor');
			const blockProps = useBlockProps();
			const innerBlocksProps = useInnerBlocksProps(blockProps)

			// Set layout attribute (to enable native drag and drop).
			useEffect(function () {
				if (!attributes.layout) {
					setAttributes({
						layout: {
							type: 'flex',
							orientation: 'horizontal',
						},
					});
				}
			}, [attributes.layout]);

			// Get image blocks.
			const imageBlocks = useSelect(function (select) {
				return select('core/block-editor').getBlocks(clientId);
			}, [clientId]);
			const hasImages = imageBlocks && imageBlocks.length > 0;

			// Handle media selection from Media Library.
			const replaceImages = function (images) {
				if (!images || images.length === 0) {
					return;
				}
				const imageBlocksToInsert = images.map(function (image) {
					return wp.blocks.createBlock('core/image', {
						id: image.id,
						url: image.url,
						alt: image.alt || '',
						href: image.url
					});
				});
				replaceInnerBlocks(clientId, imageBlocksToInsert, false);
			};

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

			// Otherwise render gallery with images.
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

		// Saves block markup to database on page save.
		save: function Save() {
			const blockProps = useBlockProps.save();

			return createElement(
				'figure',
				blockProps,
				createElement(InnerBlocks.Content, null)
			);
		},
	});

	// ------------------------------------------------
	// Functions to hide gallery image toolbar options.
	// ------------------------------------------------

	// Hides toolbar options when gallery image blocks are selected.
	const galleryBlockObserver = new MutationObserver(function (mutations) {
		mutations.forEach(function (mutation) {
			const target = mutation.target;
			if (!target.matches('.wp-block-image.is-selected')) {
				return;
			}

			// Hide toolbar group containing 'Align' button.
			const alignButton = document.querySelector('.block-editor-block-toolbar button[aria-label="Link"]');
			const toolbarGroup = alignButton && alignButton.closest('.components-toolbar-group');
			if (toolbarGroup) {
				toolbarGroup.style.display = 'none';
			}
		});
	});

	// Observes a single gallery block for class changes.
	function observeGalleryBlock(galleryBlock) {
		galleryBlockObserver.observe(galleryBlock, {
			attributes: true,
			attributeFilter: ['class'],
			subtree: true
		});
	}

	// Watches for new gallery blocks and applies observer.
	const editorObserver = new MutationObserver(function (mutations) {
		mutations.forEach(function (mutation) {
			if (mutation.type !== 'childList') {
				return;
			}
			mutation.addedNodes.forEach(function (node) {

				// Only process element nodes.
				if (node.nodeType !== 1) return;

				// Check if added node is a gallery block
				if (node.matches('[data-type="lightbox-gallery/gallery"]')) {
					observeGalleryBlock(node);
					return;
				}

				// Otherwise check for gallery blocks within added node.
				const galleryBlocks = node.querySelectorAll('[data-type="lightbox-gallery/gallery"]');
				galleryBlocks.forEach(observeGalleryBlock);
			});
		});
	});

	// Waits for appearance of editor iframe and applies editor observer.
	let retryCount = 0;
	function addIframeEventListener() {

		// Wait for iframe to appear.
		const iframe = document.querySelector('iframe[name="editor-canvas"]');
		if (!iframe) {
			if (retryCount < 50) {
				retryCount++;
				setTimeout(addIframeEventListener, 100);
			}
			return;
		}

		// Add observers on iframe load.
		iframe.addEventListener('load', () => {
			const iframeDocument = iframe.contentDocument;
			const editorContent = iframeDocument.querySelector('.block-editor-block-list__layout');

			// Observe editor for new gallery blocks.
			editorObserver.observe(editorContent, {
				childList: true,
				subtree: true
			});

			// Observe existing gallery blocks.
			iframeDocument.querySelectorAll('[data-type="lightbox-gallery/gallery"]').forEach(observeGalleryBlock);
		});
	}

	// Start observing when DOM is ready
	document.addEventListener('DOMContentLoaded', addIframeEventListener);
})();

