'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, getCurrentUser } from '@/lib/api';
import { useCart } from '@/lib/cart';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addItem } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState('');

  // Review form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');

  const loadProduct = () => {
    api.get(`/products/${id}`).then((res) => setProduct(res.data));
  };

  useEffect(() => {
    loadProduct();
  }, [id]);

  const handleAddToCart = () => {
    addItem(
      { productId: id as string, title: product.title, price: Number(product.price), image: product.images?.[0] },
      qty,
    );
    setMessage('Added to cart!');
    setTimeout(() => setMessage(''), 2000);
  };

  const buyNow = () => {
    handleAddToCart();
    router.push('/cart');
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) {
      setReviewMessage('Please log in to leave a review.');
      return;
    }
    try {
      await api.post('/reviews', { productId: id, rating, comment });
      setComment('');
      setRating(5);
      setReviewMessage('Review submitted!');
      loadProduct(); // refresh to show the new review
    } catch (err: any) {
      setReviewMessage(err.response?.data?.message || 'Failed to submit review');
    }
  };

  if (!product) return <p>Loading...</p>;

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="h-80 bg-gray-100 rounded flex items-center justify-center text-gray-400">
        {product.images?.[0] ? (
          <img src={product.images[0]} className="h-full w-full object-cover rounded" />
        ) : (
          'No image'
        )}
      </div>
      <div>
        <h1 className="text-2xl font-bold">{product.title}</h1>
        <p className="text-gray-500 mb-2">Sold by {product.vendor?.storeName}</p>
        <p className="text-xl font-bold mb-4">₹{product.price}</p>
        <p className="mb-4">{product.description}</p>
        <div className="flex items-center gap-2 mb-4">
          <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))}
            className="border rounded px-2 py-1 w-20" />
          <button onClick={handleAddToCart} className="border border-black px-4 py-2 rounded">Add to Cart</button>
          <button onClick={buyNow} className="bg-black text-white px-4 py-2 rounded">Buy Now</button>
        </div>
        {message && <p className="text-sm text-green-600 mb-4">{message}</p>}

        <h2 className="font-semibold mt-6 mb-2">Reviews</h2>
        <div className="mb-4">
          {product.reviews?.length ? product.reviews.map((r: any) => (
            <div key={r.id} className="border-t pt-2 text-sm">
              <strong>{r.user.name}</strong> — {r.rating}★
              <p>{r.comment}</p>
            </div>
          )) : <p className="text-sm text-gray-400">No reviews yet.</p>}
        </div>

        <form onSubmit={submitReview} className="border-t pt-4 space-y-2">
          <p className="font-medium text-sm">Leave a review</p>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="border rounded px-2 py-1">
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
          </select>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience..." className="border rounded px-2 py-1 w-full" rows={2} />
          <button className="bg-black text-white px-4 py-2 rounded text-sm">Submit Review</button>
          {reviewMessage && <p className="text-sm text-blue-600">{reviewMessage}</p>}
        </form>
      </div>
    </div>
  );
}
