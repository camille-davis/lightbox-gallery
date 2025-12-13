(function () {
	const { registerBlockType } = wp.blocks;
	const { useBlockProps, InnerBlocks, MediaUpload, MediaUploadCheck, BlockControls, useInnerBlocksProps } = wp.blockEditor;
	const { Button, Placeholder } = wp.components;
	const { createElement, Fragment, useEffect } = wp.element;
	const { __ } = wp.i18n;
	const { useSelect, useDispatch, subscribe, select } = wp.data;
	const { SVG, Path } = wp.primitives;

	// Gallery icon from WordPress icons library (same as Gallery block)
	const galleryIcon = createElement(SVG, {
		viewBox: '0 0 24 24',
		xmlns: 'http://www.w3.org/2000/svg',
	}, createElement(Path, {
		d: 'M16.375 4.5H4.625a.125.125 0 0 0-.125.125v8.254l2.859-1.54a.75.75 0 0 1 .68-.016l2.384 1.142 2.89-2.074a.75.75 0 0 1 .874 0l2.313 1.66V4.625a.125.125 0 0 0-.125-.125Zm.125 9.398-2.75-1.975-2.813 2.02a.75.75 0 0 1-.76.067l-2.444-1.17L4.5 14.583v1.792c0 .069.056.125.125.125h11.75a.125.125 0 0 0 .125-.125v-2.477ZM4.625 3C3.728 3 3 3.728 3 4.625v11.75C3 17.273 3.728 18 4.625 18h11.75c.898 0 1.625-.727 1.625-1.625V4.625C18 3.728 17.273 3 16.375 3H4.625ZM20 8v11c0 .69-.31 1-.999 1H6v1.5h13.001c1.52 0 2.499-.982 2.499-2.5V8H20Z',
		fillRule: 'evenodd',
		clipRule: 'evenodd',
	}));

	registerBlockType('lightbox-gallery/gallery', {
		icon: galleryIcon,
		edit: function Edit(props) {
			const { clientId, attributes, setAttributes } = props;
			const blockProps = useBlockProps({
				className: 'wp-block-lightbox-gallery-gallery',
			});

			// Get inner blocks count
			const innerBlocks = useSelect(function (select) {
				return select('core/block-editor').getBlocks(clientId);
			}, [clientId]);

			const hasImages = innerBlocks && innerBlocks.length > 0;

			// Get replaceInnerBlocks function
			const { replaceInnerBlocks } = useDispatch('core/block-editor');

			// Set allowResize to false to disable image resize controls
			useEffect(function () {
				if (attributes.allowResize !== false) {
					setAttributes({ allowResize: false });
				}
			}, []);

			// Set layout attribute to flex with horizontal orientation (like Gallery block)
			useEffect(function () {
				if (!attributes.layout || attributes.layout.type !== 'flex' || attributes.layout.orientation !== 'horizontal') {
					setAttributes({
						layout: {
							type: 'flex',
							orientation: 'horizontal',
						},
					});
				}
			}, [attributes.layout]);

			// Get orientation from layout attribute (defaults to horizontal)
			const layoutOrientation = attributes.layout?.orientation || 'horizontal';

			// Inner blocks props (must be called unconditionally - hooks rule)
			const innerBlocksProps = useInnerBlocksProps(blockProps, {
				allowedBlocks: ['core/image'],
				templateLock: false,
				orientation: layoutOrientation,
			});

			// Handle media selection from Media Library
			const onSelectImages = function (images) {
				if (!images || images.length === 0) {
					return;
				}
				const imageBlocks = images.map(function (image) {
					return wp.blocks.createBlock('core/image', {
						id: image.id,
						url: image.url,
						alt: image.alt || '',
						sizeSlug: attributes.sizeSlug || 'large',
					});
				});
				replaceInnerBlocks(clientId, imageBlocks, false);
			};

			// Handle adding more images (matches Gallery block implementation)
			const onAddImages = function (selectedImages) {
				// Create a map of new order from selected images
				const newOrderMap = selectedImages.reduce(function (result, image, index) {
					result[image.id] = index;
					return result;
				}, {});

				// Filter existing image blocks to only keep those that are in selectedImages
				const existingImageBlocks = innerBlocks.filter(function (block) {
					return selectedImages.some(function (img) {
						return img.id === block.attributes.id;
					});
				});

				// Filter selectedImages to only get images that don't already exist
				const newImageList = selectedImages.filter(function (img) {
					return !existingImageBlocks.some(function (existingImg) {
						return img.id === existingImg.attributes.id;
					});
				});

				// Create new blocks for new images
				const newBlocks = newImageList.map(function (image) {
					return wp.blocks.createBlock('core/image', {
						id: image.id,
						url: image.url,
						alt: image.alt || '',
						sizeSlug: attributes.sizeSlug || 'large',
					});
				});

				// Replace all inner blocks with existing + new blocks, sorted by new order
				if (existingImageBlocks.length > 0 || newBlocks.length > 0) {
					const allBlocks = existingImageBlocks.concat(newBlocks);
					allBlocks.sort(function (a, b) {
						const aOrder = newOrderMap[a.attributes.id] ?? Infinity;
						const bOrder = newOrderMap[b.attributes.id] ?? Infinity;
						return aOrder - bOrder;
					});
					replaceInnerBlocks(clientId, allBlocks, false);
				}
			};

			// Empty state placeholder
			if (!hasImages) {
				return createElement(
					'div',
					innerBlocksProps,
					createElement(
						Placeholder,
						{
							icon: galleryIcon,
							label: __('Lightbox Gallery'),
							instructions: __('Choose images from your library.'),
						},
						createElement(
							MediaUploadCheck,
							null,
							createElement(
								MediaUpload,
								{
									onSelect: onSelectImages,
									allowedTypes: ['image'],
									multiple: true,
									gallery: true,
									value: [],
									render: function (obj) {
										return createElement(Button, {
											variant: 'primary',
											onClick: obj.open,
										}, __('Choose Images'));
									},
								}
							)
						)
					)
				);
			}

			// Gallery with images
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
							onSelect: onAddImages,
							allowedTypes: ['image'],
							multiple: true,
							gallery: true,
							addToGallery: true,
							value: innerBlocks.map(function (block) {
								return block.attributes.id;
							}).filter(Boolean),
							render: function (obj) {
								return createElement(Button, {
									variant: 'tertiary',
									onClick: obj.open,
								}, __('Add'));
							},
						}
					)
					)
				),
				createElement('figure', innerBlocksProps, createElement(InnerBlocks, null))
			);
		},

		save: function Save() {
			const blockProps = useBlockProps.save({
				className: 'wp-block-lightbox-gallery-gallery',
			});

			return createElement(
				'figure',
				blockProps,
				createElement(InnerBlocks.Content, null)
			);
		},
	});

	// Listen for image block selection and hide duotone toolbar when in lightbox-gallery
	(function () {
		let previousSelectedBlockClientId = null;

		function hideDuotoneToolbarGroup() {
			const duotoneButton = document.querySelector('.block-editor-block-toolbar button[aria-label="Apply duotone filter"]');
			if (duotoneButton) {
				const toolbarGroup = duotoneButton.closest('.components-toolbar-group');
				if (toolbarGroup) {
					toolbarGroup.style.display = 'none';
				}
			}
		}

		subscribe(function () {
			const blockEditor = select('core/block-editor');
			const selectedBlock = blockEditor.getSelectedBlock();

			if (!selectedBlock || selectedBlock.clientId === previousSelectedBlockClientId) {
				if (!selectedBlock) {
					previousSelectedBlockClientId = null;
				}
				return;
			}

			previousSelectedBlockClientId = selectedBlock.clientId;

			if (selectedBlock.name === 'core/image') {
				const parentIds = blockEditor.getBlockParents(selectedBlock.clientId, true);
				const isInLightboxGallery = parentIds.some(function (parentId) {
					const parentBlock = blockEditor.getBlock(parentId);
					return parentBlock && parentBlock.name === 'lightbox-gallery/gallery';
				});

				if (isInLightboxGallery) {
					hideDuotoneToolbarGroup();
					requestAnimationFrame(hideDuotoneToolbarGroup);
				}
			}
		});
	})();
})();

