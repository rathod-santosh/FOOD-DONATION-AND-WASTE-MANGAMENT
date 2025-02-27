document.querySelectorAll('.update-form').forEach(form => {
    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const formData = new FormData(this);
        const donationId = this.dataset.id;
        const deliveryMethod = formData.get('deliveryMethod');
        const deliveryCharge = formData.get('deliveryCharge');
        const pickupLocation = formData.get('pickupLocation');
        const dropLocation = formData.get('dropLocation');

        if (!deliveryMethod) {
            alert('Please select a delivery method');
            return;
        }

        if (deliveryMethod === 'assigned_delivery' && (!pickupLocation || !dropLocation)) {
            alert('Please enter Pickup and Drop Location');
            return;
        }

        try {
            const response = await fetch(`/update-donation-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    donationId,
                    deliveryMethod,
                    deliveryCharge,
                    pickupLocation,
                    dropLocation,
                    status: "Accepted"
                })
            });

            const result = await response.json();

            if (result.success) {
                alert('Delivery method updated successfully! ✅');
                fetchPendingDeliveries();
            } else {
                alert('Error updating delivery method! ❌');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Server error! Please try again.');
        }
    });
});




async function fetchPendingDeliveries() {
    try {
        const response = await fetch('/delivery/pending');  // Fetch pending deliveries
        const deliveries = await response.json(); 

        const pendingSection = document.querySelector('.pending-deliveries-section');
        if (!pendingSection) return; 

        pendingSection.innerHTML = deliveries.length > 0
            ? deliveries.map(delivery => `
                <div class="delivery-item">
                    <p><strong>Food:</strong> ${delivery.foodname}</p>
                    <p><strong>Delivery Charge:</strong> ₹${delivery.deliveryCharge || 0}</p>
                    <p><strong>Pickup Location:</strong> ${delivery.pickupLocation || 'Not Provided'}</p>
                    <p><strong>Drop Location:</strong> ${delivery.dropLocation || 'Not Provided'}</p>
                    <p><strong>Status:</strong> ${delivery.deliveryStatus}</p>
                </div>
            `).join('')
            : `<p>No pending deliveries.</p>`;
    } catch (error) {
        console.error("Error fetching pending deliveries:", error);
    }
}

// Call the function on page load
fetchPendingDeliveries();
