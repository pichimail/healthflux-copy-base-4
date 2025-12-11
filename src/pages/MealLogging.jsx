import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Camera, Upload, Loader2, TrendingUp, Calendar,
  Apple, Flame, Scale, Activity, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp, Sparkles, Target } from
'lucide-react';
import { format, isToday, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import ProfileSwitcher from '../components/ProfileSwitcher';
import AINutritionistAssistant from '../components/nutrition/AINutritionistAssistant';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function MealLogging() {
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedMeal, setExpandedMeal] = useState(null);
  const [showGoalCalc, setShowGoalCalc] = useState(false);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles', user?.email],
    queryFn: () => base44.entities.Profile.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user
  });

  React.useEffect(() => {
    if (profiles.length > 0 && !selectedProfileId) {
      const selfProfile = profiles.find((p) => p.relationship === 'self');
      setSelectedProfileId(selfProfile?.id || profiles[0].id);
    }
  }, [profiles, selectedProfileId]);

  const { data: nutritionGoal } = useQuery({
    queryKey: ['nutritionGoal', selectedProfileId],
    queryFn: () => base44.entities.NutritionGoal.filter({ profile_id: selectedProfileId }, '-created_date', 1).then((goals) => goals[0] || null),
    enabled: !!selectedProfileId
  });

  const { data: todayMeals = [] } = useQuery({
    queryKey: ['todayMeals', selectedProfileId, selectedDate],
    queryFn: async () => {
      const meals = await base44.entities.MealLog.filter({
        profile_id: selectedProfileId,
        meal_date: selectedDate
      }, '-created_date');
      return meals;
    },
    enabled: !!selectedProfileId
  });

  const { data: monthMeals = [] } = useQuery({
    queryKey: ['monthMeals', selectedProfileId],
    queryFn: async () => {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      const allMeals = await base44.entities.MealLog.filter({
        profile_id: selectedProfileId
      }, '-meal_date', 500);
      return allMeals.filter((m) => {
        const mealDate = new Date(m.meal_date);
        return mealDate >= start && mealDate <= end;
      });
    },
    enabled: !!selectedProfileId
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const result = await base44.integrations.Core.UploadFile({ file });
      return result.file_url;
    }
  });

  const analyzeMutation = useMutation({
    mutationFn: async ({ image_url, profile_id }) => {
      const { data } = await base44.functions.invoke('analyzeMealPhoto', {
        image_url,
        profile_id
      });
      return data;
    }
  });

  const saveMealMutation = useMutation({
    mutationFn: (mealData) => base44.entities.MealLog.create(mealData),
    onSuccess: () => {
      queryClient.invalidateQueries(['todayMeals']);
      queryClient.invalidateQueries(['monthMeals']);
      setAnalysisResult(null);
    }
  });

  const calculateGoalMutation = useMutation({
    mutationFn: async (profile_id) => {
      const { data } = await base44.functions.invoke('calculateDailyCalorieGoal', { profile_id });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['nutritionGoal']);
      setShowGoalCalc(false);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setAnalyzing(true);

    try {
      const imageUrl = await uploadMutation.mutateAsync(file);
      const result = await analyzeMutation.mutateAsync({
        image_url: imageUrl,
        profile_id: selectedProfileId
      });
      setAnalysisResult({ ...result.analysis, image_url: imageUrl });
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to analyze meal. Please try again.');
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const handleSaveMeal = () => {
    if (!analysisResult) return;

    const now = new Date();
    saveMealMutation.mutate({
      profile_id: selectedProfileId,
      meal_name: analysisResult.meal_name,
      image_url: analysisResult.image_url,
      calories: analysisResult.calories,
      protein: analysisResult.protein,
      carbs: analysisResult.carbs,
      fat: analysisResult.fat,
      fiber: analysisResult.fiber,
      sodium: analysisResult.sodium,
      sugar: analysisResult.sugar,
      meal_date: format(now, 'yyyy-MM-dd'),
      meal_time: format(now, 'HH:mm'),
      health_feedback: analysisResult.health_feedback,
      recommendations: analysisResult.recommendations,
      ingredients: analysisResult.ingredients,
      portion_size: analysisResult.portion_size
    });
  };

  // Calculate daily totals
  const dailyTotals = todayMeals.reduce((acc, meal) => ({
    calories: acc.calories + (meal.calories || 0),
    protein: acc.protein + (meal.protein || 0),
    carbs: acc.carbs + (meal.carbs || 0),
    fat: acc.fat + (meal.fat || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const remainingCalories = nutritionGoal ? nutritionGoal.daily_calories - dailyTotals.calories : 0;
  const calorieProgress = nutritionGoal ? dailyTotals.calories / nutritionGoal.daily_calories * 100 : 0;

  // Monthly stats
  const monthlyCalories = monthMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const avgDailyCalories = monthMeals.length > 0 ? Math.round(monthlyCalories / new Date().getDate()) : 0;

  // Chart data
  const last7DaysData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayMeals = monthMeals.filter((m) => m.meal_date === dateStr);
    const dayCalories = dayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
    return {
      date: format(date, 'MMM d'),
      calories: dayCalories,
      goal: nutritionGoal?.daily_calories || 2000
    };
  });

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A0A0A] mb-1">
          🍽️ Meal Logging
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Flux's nutrition tracking</p>
        
        {profiles.length > 0 &&
        <ProfileSwitcher
          profiles={profiles}
          selectedProfile={selectedProfileId}
          onProfileChange={setSelectedProfileId} />

        }
      </div>

      {/* Daily Goals Summary */}
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl mb-4" style={{ backgroundColor: '#E9F46A' }}>
        <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <Target className="w-5 h-5" />
              Daily Goals - {format(new Date(selectedDate), 'MMM d')}
            </CardTitle>
            {!nutritionGoal &&
            <Button
              size="sm"
              onClick={() => setShowGoalCalc(true)}
              className="bg-[#0A0A0A] text-white rounded-xl text-xs">

                <Sparkles className="w-3 h-3 mr-1" />
                Generate
              </Button>
            }
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          {nutritionGoal ?
          <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold">Calories</span>
                  <span className="text-sm">
                    {dailyTotals.calories} / {nutritionGoal.daily_calories}
                    <span className="text-xs ml-2 text-gray-600">
                      ({remainingCalories > 0 ? remainingCalories : 0} left)
                    </span>
                  </span>
                </div>
                <Progress value={Math.min(calorieProgress, 100)} className="h-3" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/80 p-2 rounded-xl">
                  <div className="text-xs text-gray-600">Protein</div>
                  <div className="text-sm font-bold">{dailyTotals.protein}g / {nutritionGoal.daily_protein}g</div>
                  <Progress value={dailyTotals.protein / nutritionGoal.daily_protein * 100} className="h-1 mt-1" />
                </div>
                <div className="bg-white/80 p-2 rounded-xl">
                  <div className="text-xs text-gray-600">Carbs</div>
                  <div className="text-sm font-bold">{dailyTotals.carbs}g / {nutritionGoal.daily_carbs}g</div>
                  <Progress value={dailyTotals.carbs / nutritionGoal.daily_carbs * 100} className="h-1 mt-1" />
                </div>
                <div className="bg-white/80 p-2 rounded-xl">
                  <div className="text-xs text-gray-600">Fat</div>
                  <div className="text-sm font-bold">{dailyTotals.fat}g / {nutritionGoal.daily_fat}g</div>
                  <Progress value={dailyTotals.fat / nutritionGoal.daily_fat * 100} className="h-1 mt-1" />
                </div>
              </div>

              {nutritionGoal.is_ai_generated && nutritionGoal.rationale &&
            <div className="bg-white/50 p-3 rounded-xl text-xs">
                  <p className="font-semibold mb-1">Flux Recommendation:</p>
                  <p className="text-gray-700">{nutritionGoal.rationale}</p>
                </div>
            }
            </div> :

          <div className="text-center py-4">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-3">No nutrition goals set</p>
              <Button
              onClick={() => setShowGoalCalc(true)}
              className="bg-[#0A0A0A] text-white rounded-2xl"
              disabled={calculateGoalMutation.isLoading}>

                {calculateGoalMutation.isLoading ?
              <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Calculating...
                  </> :

              <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Calculate My Goals
                  </>
              }
              </Button>
            </div>
          }
        </CardContent>
      </Card>

      {/* Goal Calculation Modal */}
      {showGoalCalc &&
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl mb-4" style={{ backgroundColor: '#EDE6F7' }}>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">Generate Personalized Goals</h3>
            <p className="text-xs text-gray-700 mb-3">
              Our AI will analyze your health data (vitals, trends, conditions) to calculate optimal daily nutrition goals.
            </p>
            <div className="flex gap-2">
              <Button
              onClick={() => calculateGoalMutation.mutate(selectedProfileId)}
              disabled={calculateGoalMutation.isLoading}
              className="flex-1 bg-[#0A0A0A] text-white rounded-2xl">

                {calculateGoalMutation.isLoading ?
              <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Calculating...
                  </> :

              'Generate Goals'
              }
              </Button>
              <Button
              variant="outline"
              onClick={() => setShowGoalCalc(false)}
              className="rounded-2xl">

                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      }

      {/* Upload Section */}
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl mb-4">
        <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Log a Meal
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="text-center">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
              id="meal-upload"
              disabled={uploading} />

            <label
              htmlFor="meal-upload"
              className={`inline-flex items-center justify-center gap-2 px-6 py-4 bg-[#EFF1ED] hover:bg-[#DFE1DD] text-[#0A0A0A] rounded-2xl font-semibold cursor-pointer transition-all active-press ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>

              {uploading ?
              <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {analyzing ? 'Analyzing...' : 'Uploading...'}
                </> :

              <>
                  <Camera className="w-5 h-5" />
                  Take Photo / Upload
                </>
              }
            </label>
            <p className="text-xs text-gray-600 mt-2">Flux will analyze nutrition instantly</p>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisResult &&
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl mb-4" style={{ backgroundColor: '#F7C9A3' }}>
          <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
            <CardTitle className="text-sm sm:text-base font-semibold">Analysis Results</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="space-y-3">
              <img
              src={analysisResult.image_url}
              alt="Meal"
              className="w-full h-48 object-cover rounded-2xl" />


              <div>
                <h3 className="font-bold text-lg">{analysisResult.meal_name}</h3>
                <p className="text-sm text-gray-700">{analysisResult.description}</p>
                {analysisResult.portion_size &&
              <Badge variant="outline" className="mt-2">{analysisResult.portion_size}</Badge>
              }
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="bg-white/80 p-2 rounded-xl text-center">
                  <Flame className="w-4 h-4 mx-auto mb-1 text-orange-600" />
                  <div className="text-xs text-gray-600">Calories</div>
                  <div className="text-sm font-bold">{analysisResult.calories}</div>
                </div>
                <div className="bg-white/80 p-2 rounded-xl text-center">
                  <div className="text-xs text-gray-600">Protein</div>
                  <div className="text-sm font-bold">{analysisResult.protein}g</div>
                </div>
                <div className="bg-white/80 p-2 rounded-xl text-center">
                  <div className="text-xs text-gray-600">Carbs</div>
                  <div className="text-sm font-bold">{analysisResult.carbs}g</div>
                </div>
                <div className="bg-white/80 p-2 rounded-xl text-center">
                  <div className="text-xs text-gray-600">Fat</div>
                  <div className="text-sm font-bold">{analysisResult.fat}g</div>
                </div>
              </div>

              <div className="bg-white/50 p-3 rounded-xl">
                <p className="text-xs font-semibold mb-1">Health Feedback:</p>
                <p className="text-xs text-gray-700">{analysisResult.health_feedback}</p>
              </div>

              {analysisResult.recommendations && analysisResult.recommendations.length > 0 &&
            <div className="bg-white/50 p-3 rounded-xl">
                  <p className="text-xs font-semibold mb-2">Recommendations:</p>
                  <ul className="space-y-1">
                    {analysisResult.recommendations.map((rec, idx) =>
                <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5 text-green-600" />
                        {rec}
                      </li>
                )}
                  </ul>
                </div>
            }

              {analysisResult.warnings && analysisResult.warnings.length > 0 &&
            <div className="bg-red-50 p-3 rounded-xl">
                  <p className="text-xs font-semibold mb-2 text-red-700">⚠️ Warnings:</p>
                  <ul className="space-y-1">
                    {analysisResult.warnings.map((warn, idx) =>
                <li key={idx} className="text-xs text-red-700">{warn}</li>
                )}
                  </ul>
                </div>
            }

              <Button
              onClick={handleSaveMeal}
              disabled={saveMealMutation.isLoading}
              className="w-full bg-[#0A0A0A] text-white rounded-2xl">

                {saveMealMutation.isLoading ?
              <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </> :

              'Save Meal'
              }
              </Button>
            </div>
          </CardContent>
        </Card>
      }

      {/* AI Nutritionist Assistant */}
      <AINutritionistAssistant
        profileId={selectedProfileId}
        recentMeals={todayMeals}
        nutritionGoal={nutritionGoal}
      />

      {/* Weekly Trend Chart */}
      {last7DaysData.length > 0 &&
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl mb-4">
          <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              7-Day Calorie Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={last7DaysData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E3" />
                <XAxis dataKey="date" style={{ fontSize: '11px' }} />
                <YAxis style={{ fontSize: '11px' }} />
                <Tooltip />
                <Line type="monotone" dataKey="calories" stroke="#F7C9A3" strokeWidth={2} name="Actual" />
                <Line type="monotone" dataKey="goal" stroke="#0B5A46" strokeWidth={2} strokeDasharray="5 5" name="Goal" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      }

      {/* Today's Meals */}
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl mb-4">
        <CardHeader className="border-b border-gray-100 p-3 sm:p-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm sm:text-base font-semibold">Today's Meals</CardTitle>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto h-9 rounded-xl text-xs" />

          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          {todayMeals.length === 0 ?
          <div className="text-center py-8 text-gray-500 text-sm">
              No meals logged yet today
            </div> :

          <div className="space-y-2">
              {todayMeals.map((meal) =>
            <div
              key={meal.id}
              className="bg-[#F4F4F2] p-3 rounded-2xl cursor-pointer hover:bg-[#E8E8E3]"
              onClick={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}>

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{meal.meal_name}</h4>
                      <p className="text-xs text-gray-600">{meal.meal_time}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {meal.calories} cal
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          P: {meal.protein}g
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          C: {meal.carbs}g
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          F: {meal.fat}g
                        </Badge>
                      </div>
                    </div>
                    {expandedMeal === meal.id ?
                <ChevronUp className="w-4 h-4 text-gray-600" /> :

                <ChevronDown className="w-4 h-4 text-gray-600" />
                }
                  </div>

                  {expandedMeal === meal.id &&
              <div className="mt-3 space-y-2">
                      {meal.image_url &&
                <img
                  src={meal.image_url}
                  alt={meal.meal_name}
                  className="w-full h-32 object-cover rounded-xl" />

                }
                      {meal.health_feedback &&
                <p className="text-xs text-gray-700">{meal.health_feedback}</p>
                }
                    </div>
              }
                </div>
            )}
            </div>
          }
        </CardContent>
      </Card>

      {/* Monthly Stats */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Card className="border-0 card-shadow rounded-2xl">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-gray-600 mb-1">Avg Daily</div>
            <div className="text-xl sm:text-2xl font-bold text-[#0A0A0A]">
              {avgDailyCalories}
            </div>
            <div className="text-xs text-gray-600">cal/day</div>
          </CardContent>
        </Card>
        <Card className="border-0 card-shadow rounded-2xl">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs text-gray-600 mb-1">This Month</div>
            <div className="text-xl sm:text-2xl font-bold text-[#0A0A0A]">
              {monthMeals.length}
            </div>
            <div className="text-xs text-gray-600">meals logged</div>
          </CardContent>
        </Card>
      </div>
    </div>);

}