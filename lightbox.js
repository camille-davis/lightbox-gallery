/**
 * Lightbox Gallery Plugin - Lightbox display functionality.
 */
(function ($) {
	const tabindexStore = new Map();
	const focusableSelector = 'a[href]:not([tabindex="-1"]):not([aria-hidden="true"]), ' +
		'button:not(:disabled):not([tabindex="-1"]):not([aria-hidden="true"]), ' +
		'input:not(:disabled):not([tabindex="-1"]):not([aria-hidden="true"]), ' +
		'select:not(:disabled):not([tabindex="-1"]):not([aria-hidden="true"]), ' +
		'textarea:not(:disabled):not([tabindex="-1"]):not([aria-hidden="true"]), ' +
		'summary:not(:disabled):not([tabindex="-1"]):not([aria-hidden="true"]), ' +
		'[tabindex]:not([tabindex="-1"]):not([aria-hidden="true"])';

	// Places overlay flush with bottom of admin bar.
	function updateOverlayOffset() {
		const $adminBar = $('#wpadminbar');
		const $overlay = $('#wp-block-lightbox-gallery-overlay');
		if (!$adminBar.length || !$overlay.length) {
			return;
		}
		$overlay.css('top', $adminBar[0].getBoundingClientRect().bottom + 'px');
	}

	// Removes elements from tab flow if they are outside overlay or admin bar.
	function trapFocus() {
		$(focusableSelector).each(function() {
			const $el = $(this);
			const element = this;

			// Skip element if already processed, or inside overlay or admin bar.
			if (tabindexStore.has(element) ||
				$el.closest('#wp-block-lightbox-gallery-overlay').length ||
				$el.closest('#wpadminbar').length) {
				return;
			}

			// Save original tabindex.
			const originalTabindex = $el.attr('tabindex');
			tabindexStore.set(element, originalTabindex !== undefined ? originalTabindex : null);

			// Remove element from tab flow.
			$el.attr('tabindex', '-1');
		});
	}

	// Restores saved tabindex values.
	function restoreFocus() {
		tabindexStore.forEach((originalTabindex, element) => {
			const $el = $(element);
			if (originalTabindex === null) {
				$el.removeAttr('tabindex');
			} else {
				$el.attr('tabindex', originalTabindex);
			}
		});
		tabindexStore.clear();
	}

	// Set the slide to the current figure and updates button actions.
	function setSlide($figure) {
		const $prevFigure = $figure.prev();
		const $nextFigure = $figure.next();
		const $img = $figure.find('img');
		const $caption = $figure.find('figcaption');
		const $overlay = $('#wp-block-lightbox-gallery-overlay');

		// Update image and caption.
		$overlay.find('img').attr({
			src: $img.attr('src'),
			alt: $img.attr('alt').replace('View image: ', '')
		});
		$overlay.find('figcaption').text($caption.text().trim() || '');

		// Remove existing buttons and actions.
		$('.lightbox-close').remove();
		$('.lightbox-nav').remove();
		$(document).off('keydown.lightbox');

		// Add 'close' button.
		$('<button class="lightbox-button lightbox-close" aria-label="Close lightbox"><span></span><span></span></button>')
		.appendTo($overlay)
		.on('click', function() {
			closeLightbox($figure);
		});

		// Add close action on clicking overlay background.
		$overlay.on('click', function(e) {
			if (!$(e.target).closest('img, figcaption, button').length) {
				closeLightbox($figure);
			}
		});

		// Add close action on 'esc'.
		$(document).on('keydown.lightbox', function(e) {
			if (e.key === 'Escape') {
				closeLightbox($figure);
			}
		});

		// Add 'prev' button and keyboard action.
		if ($prevFigure.length) {
			$('<button class="lightbox-button lightbox-nav lightbox-prev" aria-label="Previous image"><span></span><span></span></button>')
			.appendTo($overlay)
			.on('click', function() {
				setSlide($prevFigure);
			});

			$(document).on('keydown.lightbox', function(e) {
				if (e.key === 'ArrowLeft') {
					setSlide($prevFigure);
				}
			});
		}

		// Add 'next' button and keyboard action.
		if ($nextFigure.length) {
			$('<button class="lightbox-button lightbox-nav lightbox-next" aria-label="Next image"><span></span><span></span></button>')
			.appendTo($overlay)
			.on('click', function() {
				setSlide($nextFigure);
			});

			$(document).on('keydown.lightbox', function(e) {
				if (e.key === 'ArrowRight') {
					setSlide($nextFigure);
				}
			});
		}
	}

	// Opens lightbox and set slide to the given figure.
	function openLightbox($figure) {

		// Create overlay HTML.
		$('body').css('overflow', 'hidden');
		const $overlay = $('<div class="wp-block-lightbox-gallery-overlay" id="wp-block-lightbox-gallery-overlay">' +
			'<figure class="image-wrapper"><img alt=""/><figcaption></figcaption></figure>' +
			'</div>')
			.appendTo('body');

		updateOverlayOffset();
		trapFocus();
		setSlide($figure);
		$overlay.hide().fadeIn(300);
	}

	// Closes lightbox and restores focus to figure that was open.
	function closeLightbox($figure) {
		restoreFocus();

		// Close overlay and move focus.
		$('body').css('overflow', '');
		$('#wp-block-lightbox-gallery-overlay').fadeOut(300, function() {
			$(this).remove();
			$figure.find('a').focus();
		});
	}

	// Initialize gallery links to open lightbox.
	$('.wp-block-lightbox-gallery-gallery').each(function () {
		const $gallery = $(this);
		$gallery.find('.wp-block-image').each(function () {
			const $figure = $(this);
			$figure.find("a").on("click", function (e) {
				e.preventDefault();
				openLightbox($figure);
			});
		});
	});

	// Update overlay offset on resize.
	window.addEventListener('resize', updateOverlayOffset);
})(jQuery);
