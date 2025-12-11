import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send, Loader2, ChefHat, Calendar, ShoppingCart, Lightbulb, MessageCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AINutritionistAssistant({ profileId, recentMeals, nutritionGoal }) {
  const [activeTab, setActiveTab] = useState('chat');
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [mealPlan, setMealPlan] = useState(null);
  const [mealPlanDays, setMealPlanDays] = useState(7);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const chatMutation = useMutation({
    mutationFn: async (userMessage) => {
      const { data } = await base44.functions.invoke('aiNutritionistChat', {
        profile_id: profileId,
        message: userMessage,
        conversation_history: conversation
      });
      return data;
    },
    onSuccess: (data) => {
      setConversation([
        ...conversation,
        { role: 'user', content: message },
        { role: 'assistant', content: data.response }
      ]);
      setMessage('');
    }
  });

  const mealPlanMutation = useMutation({
    mutationFn: async () => {
      const { data } = await base44.functions.invoke('generateMealPlan', {
        profile_id: profileId,
        days: mealPlanDays,
        meal_types: ['breakfast', 'lunch', 'dinner', 'snack']
      });
      return data;
    },
    onSuccess: (data) => {
      setMealPlan(data.plan);
      setShowPlanDialog(true);
    }
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    chatMutation.mutate(message);
  };

  const quickQuestions = [
    "Analyze my recent meals",
    "What am I missing nutritionally?",
    "Suggest healthier alternatives",
    "How can I increase my protein?",
    "Best foods for energy?",
  ];

  return (
    <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
      <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
        <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Flux AI Nutritionist
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 rounded-2xl h-11 mb-4">
            <TabsTrigger value="chat" className="text-xs sm:text-sm rounded-xl">
              <MessageCircle className="w-4 h-4 mr-1" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="analysis" className="text-xs sm:text-sm rounded-xl">
              <Lightbulb className="w-4 h-4 mr-1" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="plan" className="text-xs sm:text-sm rounded-xl">
              <Calendar className="w-4 h-4 mr-1" />
              Meal Plan
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-3">
            <div className="bg-[#F4F4F2] rounded-2xl p-3 h-64 overflow-y-auto space-y-2">
              {conversation.length === 0 ? (
                <div className="text-center py-8">
                  <ChefHat className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-4">Ask me anything about nutrition!</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {quickQuestions.slice(0, 3).map((q, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="cursor-pointer hover:bg-purple-50 text-xs"
                        onClick={() => setMessage(q)}
                      >
                        {q}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                conversation.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-xl text-xs ${
                      msg.role === 'user'
                        ? 'bg-purple-100 text-purple-900 ml-8'
                        : 'bg-white text-gray-800 mr-8'
                    }`}
                  >
                    <p className="font-semibold mb-1">
                      {msg.role === 'user' ? 'You' : 'Flux Nutritionist'}
                    </p>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))
              )}
              {chatMutation.isPending && (
                <div className="flex items-center gap-2 text-xs text-gray-600 p-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about nutrition..."
                className="rounded-2xl text-sm"
                disabled={chatMutation.isPending}
              />
              <Button
                type="submit"
                size="icon"
                className="bg-purple-600 hover:bg-purple-700 rounded-2xl flex-shrink-0"
                disabled={chatMutation.isPending || !message.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>

            {conversation.length === 0 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-600 font-semibold">Quick questions:</p>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((q, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="cursor-pointer hover:bg-purple-50 text-xs"
                      onClick={() => setMessage(q)}
                    >
                      {q}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-3">
            <div className="space-y-2">
              <Button
                onClick={() => chatMutation.mutate("Analyze my recent meals and provide detailed feedback on nutritional balance, identify deficiencies, and suggest improvements.")}
                disabled={chatMutation.isPending || recentMeals?.length === 0}
                className="w-full bg-purple-600 hover:bg-purple-700 rounded-2xl text-sm active-press"
              >
                {chatMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Analyze Recent Meals
                  </>
                )}
              </Button>

              <Button
                onClick={() => chatMutation.mutate("What nutritional deficiencies might I have based on my recent meals? Suggest specific foods to address them.")}
                disabled={chatMutation.isPending || recentMeals?.length === 0}
                variant="outline"
                className="w-full rounded-2xl text-sm active-press"
              >
                Check for Deficiencies
              </Button>

              <Button
                onClick={() => chatMutation.mutate("Suggest healthier alternatives for my recent meals while keeping them tasty and practical.")}
                disabled={chatMutation.isPending || recentMeals?.length === 0}
                variant="outline"
                className="w-full rounded-2xl text-sm active-press"
              >
                Get Healthier Alternatives
              </Button>
            </div>

            {!recentMeals || recentMeals.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-600">
                Log some meals first to get personalized analysis
              </div>
            ) : null}

            {conversation.length > 0 && (
              <div className="bg-[#F4F4F2] rounded-2xl p-3 max-h-64 overflow-y-auto">
                {conversation.slice(-3).map((msg, i) => (
                  msg.role === 'assistant' && (
                    <div key={i} className="bg-white p-3 rounded-xl text-xs mb-2">
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  )
                ))}
              </div>
            )}
          </TabsContent>

          {/* Meal Plan Tab */}
          <TabsContent value="plan" className="space-y-3">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold">Plan Duration:</label>
                <select
                  value={mealPlanDays}
                  onChange={(e) => setMealPlanDays(Number(e.target.value))}
                  className="border rounded-xl px-3 py-2 text-sm"
                >
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                </select>
              </div>

              <Button
                onClick={() => mealPlanMutation.mutate()}
                disabled={mealPlanMutation.isPending}
                className="w-full bg-purple-600 hover:bg-purple-700 rounded-2xl active-press"
              >
                {mealPlanMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Plan...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Generate {mealPlanDays}-Day Meal Plan
                  </>
                )}
              </Button>

              {nutritionGoal && (
                <div className="bg-purple-50 p-3 rounded-xl text-xs">
                  <p className="font-semibold mb-1">Plan will be based on:</p>
                  <p>• {nutritionGoal.daily_calories} cal/day</p>
                  <p>• Goal: {nutritionGoal.goal_type.replace(/_/g, ' ')}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Meal Plan Dialog */}
        <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
          <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {mealPlanDays}-Day Meal Plan
              </DialogTitle>
            </DialogHeader>

            {mealPlan && (
              <div className="space-y-4 mt-4">
                {/* Nutrition Summary */}
                {mealPlan.nutrition_summary && (
                  <Card className="border-0 bg-purple-50">
                    <CardContent className="p-3">
                      <h3 className="font-semibold text-sm mb-2">Nutrition Summary</h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Avg Calories: {mealPlan.nutrition_summary.avg_daily_calories}/day</div>
                        <div>Protein: {mealPlan.nutrition_summary.avg_daily_protein}g/day</div>
                        <div>Carbs: {mealPlan.nutrition_summary.avg_daily_carbs}g/day</div>
                        <div>Fat: {mealPlan.nutrition_summary.avg_daily_fat}g/day</div>
                      </div>
                      <Badge className="mt-2 text-xs">
                        Goal Alignment: {mealPlan.nutrition_summary.goal_alignment}
                      </Badge>
                    </CardContent>
                  </Card>
                )}

                {/* Daily Meals */}
                <div className="space-y-3">
                  {Object.entries(mealPlan.meal_plan || {}).map(([day, meals]) => (
                    <Card key={day} className="border-0 card-shadow">
                      <CardHeader className="p-3 border-b">
                        <CardTitle className="text-sm font-semibold capitalize">
                          {day.replace(/_/g, ' ')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3">
                        <div className="grid gap-2">
                          {Object.entries(meals).map(([mealType, meal]) => (
                            <div key={mealType} className="bg-[#F4F4F2] p-2 rounded-xl">
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="font-semibold text-xs capitalize">{mealType}</h4>
                                <Badge variant="outline" className="text-xs">{meal.calories} cal</Badge>
                              </div>
                              <p className="text-xs font-medium">{meal.meal_name}</p>
                              <p className="text-xs text-gray-600 mt-1">{meal.description}</p>
                              <div className="text-xs text-gray-600 mt-1">
                                P: {meal.protein}g • C: {meal.carbs}g • F: {meal.fat}g
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Shopping List */}
                {mealPlan.shopping_list && mealPlan.shopping_list.length > 0 && (
                  <Card className="border-0 bg-green-50">
                    <CardContent className="p-3">
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" />
                        Shopping List
                      </h3>
                      <ul className="text-xs space-y-1">
                        {mealPlan.shopping_list.map((item, i) => (
                          <li key={i}>• {item}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Tips */}
                {mealPlan.tips && mealPlan.tips.length > 0 && (
                  <Card className="border-0 bg-yellow-50">
                    <CardContent className="p-3">
                      <h3 className="font-semibold text-sm mb-2">💡 Tips</h3>
                      <ul className="text-xs space-y-1">
                        {mealPlan.tips.map((tip, i) => (
                          <li key={i}>• {tip}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}